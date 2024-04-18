import * as faceapi from 'face-api.js';
import React from 'react';
import { collection, addDoc, serverTimestamp} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from '../firebase';
import { CONTEXT_WEB_COLLECTION, EMOTION_COLLECTION, settings } from '../Settings'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';


function EmotionDetector({ signOut, currentUser }) {
  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  const [faceLandmarkerLoaded, setFaceLandmarkerLoaded] = React.useState(false);
  const [captureVideo, setCaptureVideo] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [faceLandmarker, setFaceLandmarker] = React.useState(null);
  
  const videoRef = React.useRef();
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = React.useRef();

  let runningMode = "VIDEO";

  let attentionLevel = React.useRef(-1);
  let interactionOthers = React.useRef(-1);
  let emotions = React.useRef(null);
  let arrAttentionScore = React.useRef([]);
  let arrEmotions = React.useRef([])
  let arrInteractionOthers = React.useRef([])

  let jobRecoverFacialData = React.useRef(null);
  let jobSendDataToDB = React.useRef(null);
  let jobWaitSending = React.useRef(null);
  let jobUpdateLocalData = React.useRef(null);
    
  React.useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const uid = user.uid;
        console.log("[LOGIN] uid", uid)
        setUser(user)
      } else {
        console.log("[LOGIN] user is logged out")
        setUser(null)
      }
    });

    const loadModels = async () => {
      const uri = process.env.PUBLIC_URL + '/models';

      Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(uri),
        faceapi.nets.ageGenderNet.loadFromUri(uri),
        faceapi.nets.faceExpressionNet.loadFromUri(uri),
        faceapi.nets.faceLandmark68Net.loadFromUri(uri),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(uri),
        faceapi.nets.faceRecognitionNet.loadFromUri(uri),
        faceapi.nets.ssdMobilenetv1.loadFromUri(uri),
        faceapi.nets.tinyFaceDetector.loadFromUri(uri),
      ]).then(setModelsLoaded(true));
    }
    
    const runModel = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )

      const uri = process.env.PUBLIC_URL + '/models/face_landmarker.task';

      const localFaceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: uri },
        outputFaceBlendshapes: true,
        runningMode,
        numFaces: 1
      })

      setFaceLandmarkerLoaded(true);
      setFaceLandmarker(localFaceLandmarker)
    }

    loadModels();
    runModel();
  }, []);

  const startVideo = () => {
    setCaptureVideo(true);
    navigator.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then(stream => {
        let video = videoRef.current;
        video.srcObject = stream;
        video.play();
        
        // Clear cached data
        if (canvasRef && canvasRef.current && canvasRef.current.getContext) {
          const context = canvasRef.current.getContext('2d');
          context.clearRect(0, 0, videoWidth, videoHeight);
          faceapi.draw.drawDetections(context, []);
          faceapi.draw.drawFaceLandmarks(context, []);
          faceapi.draw.drawFaceExpressions(context, []);
        }
      })
      .catch(err => {
        console.error("[APP] error:", err);
      });
  }

  const handleVideoOnPlay = () => {
    if (canvasRef && canvasRef.current && faceLandmarkerLoaded) {
      const video = videoRef.current;
  
      video.addEventListener('loadeddata', async () => {
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(video);
        const displaySize = {
          width: videoWidth,
          height: videoHeight
        };

        faceapi.matchDimensions(canvasRef.current, displaySize);

        console.log("[APP] Video has started");

        jobRecoverFacialData.current = setInterval( async () => {
          processVideo_toAttention(video);
          processVideo_toEmotions(video, displaySize);
        }, settings.localTimeToCollectData);

        jobUpdateLocalData.current = setInterval( async () => {
          console.log("[APP] Update local variables", new Date());
          attentionLevel.current = computeAttentionLevelFinal();
          interactionOthers.current = computeInteractionOthersFinal();
          emotions.current = computeEmotionsFinal();

          console.log("[DATA] ATTENTION LEVEL: ", attentionLevel.current);
          console.log("[DATA] EMOTIONS: ", emotions.current);
          console.log("[DATA] Interaction with people: ", interactionOthers.current);
        }, settings.timeToUpdateLocalData);

        jobWaitSending.current = setInterval( () => {
          let now = new Date();
          let currSecs = now.getSeconds();
          console.log("[APP] CURRENT TIME ", currSecs)

          if (currSecs >= 58 && currSecs <= 59) {
            jobSendDataToDB.current = setInterval(async () => {
              sendContextToFirebase();
              sendEmotionToFirebase();
              console.log("[DB] Sent to Firestore");
            }, settings.timeToSendData);

            clearInterval(jobWaitSending.current);
          }
        }, settings.timeToAskForSending);
      });
    }
  };

  function processVideo_toAttention(video) {
    const results = faceLandmarker.detectForVideo(video, Date.now());
    const face = results.faceLandmarks;
    console.log("[DATA] face.length: ", face.length);
    
    if (face.length > 0) {
      const mesh = face[0];
      const eyes = results.faceBlendshapes[0];
      let score = detectAttention(mesh, eyes);

      console.log("[DATA] Attention score: ", score);
      arrAttentionScore.current.push(score);
    }
  }

  async function processVideo_toEmotions(video, displaySize) {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    console.log("[DATA] detections.length: ", detections.length);
    
    if (detections.length > 0) {
      let localInteractionOthers = detections.length >= 2 ? 1 : 0;
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      let biggestDetection = resizedDetections[0];
      let biggestBox = 0;
      resizedDetections.forEach(detection => {
        let boxSize = getBoxSize(detection)
        if( boxSize > biggestBox ) {
          biggestDetection = detection
          biggestBox = boxSize
        }
      })
      
      let localEmotions = {};
      for (const [key, value] of Object.entries(biggestDetection.expressions)) {
        localEmotions[key] = value;
      }
      arrInteractionOthers.current.push(localInteractionOthers);
      arrEmotions.current.push(localEmotions);
    }
  }

  function computeAttentionLevelFinal() {
    if (arrAttentionScore.current.length < 1)
      return -1;

    let sum = 0;
    for (let score of arrAttentionScore.current)
      sum += score;

    let lvl = attentionMap(sum / arrAttentionScore.current.length);
    arrAttentionScore.current = [];
    return lvl;
  }

  function computeEmotionsFinal() {
    if (arrEmotions.current.length < 1)
      return {'fearful': 0, 'disgusted': 0, 'angry': 0, 'sad': 0, 'surprised': 0, 'neutral': 0, 'happy': 0};
      
    let result = {}
    for (let obj of arrEmotions.current) {
      for (let emotion in obj) {
        if (!(emotion in result))
          result[emotion] = 0;
        result[emotion] += obj[emotion] / arrEmotions.current.length;
      }
    }
    arrEmotions.current = [];
    return result;
  }

  function computeInteractionOthersFinal() {
    if (arrInteractionOthers.current.length < 1)
      return -1;

    let aux = [0, 0];
    for (let val of arrInteractionOthers.current)
      aux[val]++;
    let result = aux[0] > aux[1] ? 0 : 1;
    arrInteractionOthers.current = [];
    return result;
  }

  function getBoxSize(detection) {
      const box = detection.detection.box
      var width = box.width
      var height = box.height
      return width * height
  }
  
  const sendEmotionToFirebase = async() => {
    try {
      for (let emotion in emotions.current) {
        const docRef = addDoc(collection(db, EMOTION_COLLECTION), {
          emotion: emotion,
          id_user: user.uid,
          source: "face",
          timestamp: serverTimestamp(),
          value: emotions.current[emotion]
        });
      }
    } catch (error) {
      console.error('[DB] Error adding Emotion Document: ', error);
    }
  };

  const sendContextToFirebase = () => {
    try {
      const docRef = addDoc(collection(db, CONTEXT_WEB_COLLECTION), {
        id_user: user.uid,
        timestamp: serverTimestamp(),
        interaction_others: interactionOthers.current,
        attention_level: attentionLevel.current
      });
    } catch (error) {
      console.error('[DB] Error adding Context Document: ', error);
    }
  };

  function radiansToDegrees(radians){
    const pi = Math.PI
    return radians * (180 / pi)
  }

  //---> Funcion para obtener el puntaje de la posicion de la cabeza, sacado del articulo
  function getScore(degree){
    degree = Math.abs(radiansToDegrees(degree))
    if (degree < 10) {
      return 2
    }
    if (degree < 30) {
      const adjust = (degree - 10) * 0.05
      return 2.0 - adjust
    }
    return 0
  }

  //---> Funcion para calcular el puntaje de las expresiones de los ojos(parpadear, mirar arriba, abajo, derecha, izquierda)
  function getEyesScore(eyes){
    let finalScore = 0
    const scores = []
    scores[0] = eyes.categories[9].score + eyes.categories[10].score
    scores[1] = eyes.categories[11].score + eyes.categories[12].score
    scores[2] = eyes.categories[13].score + eyes.categories[16].score
    scores[3] = eyes.categories[14].score + eyes.categories[15].score
    scores[4] = eyes.categories[17].score + eyes.categories[18].score
    
    for (let i = 0; i < scores.length; i++){
      if (i < 2){
        if (scores[i] > 1.2) finalScore += scores[i]
      }
      else{
        if (scores[i] > 1) finalScore += scores[i]
      }
    }

    return finalScore
  }

  //---> Calcular el puntaje total de la detecion
  function detectAttention(mesh, eyes){
    const radians = (a1, a2, b1, b2) => Math.atan2(b2 - a2, b1 - a1)
    const angle = {
      roll: radians(mesh[33].x, mesh[33].y, mesh[263].x, mesh[263].y),
      yaw: radians(mesh[33].x, mesh[33].z, mesh[263].x, mesh[263].z),
      pitch: radians(mesh[10].y, mesh[10].z, mesh[152].y, mesh[152].z),
    }
    
    const eyesScore = getEyesScore(eyes)
    // console.log(eyesScore)
    const headScore = getScore(angle.yaw) * getScore(angle.pitch)
    const lastScore = headScore - eyesScore

    if (isNaN(lastScore) || lastScore < 0) return 0
    else return lastScore
    // console.log(headScore - eyesScore)
  }

  //---> Categorizar el puntaje
  function attentionMap(score){
    if (score <= 1) {
      console.log("No hay concentracion")
      return 0;
    }
    else if (score <= 2) {
      console.log("Baja concentración")
      return 1;
    }  
    else if (score <= 3) {
      console.log("Concentracion media")
      return 2;
    }
    else {
      console.log("Buena concentracion")
      return 3;
    }
  }

  const closeWebcam = () => {
    if (jobRecoverFacialData.current != null)
      clearInterval(jobRecoverFacialData.current);
    if (jobUpdateLocalData.current != null)
      clearInterval(jobUpdateLocalData.current);
    if (jobSendDataToDB.current != null)
      clearInterval(jobSendDataToDB.current);
    if (jobWaitSending.current != null)
      clearInterval(jobWaitSending.current);

    jobRecoverFacialData.current = null;
    jobUpdateLocalData.current = null;
    jobSendDataToDB.current = null;
    jobWaitSending.current = null;

    if (videoRef.current != null) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCaptureVideo(false);
  }

  const localSignOut = () => {
    closeWebcam()
    signOut()
  }


  return (
    <div>
      {
        user ?
        <div>
          <div style={{ textAlign: 'center', padding: '10px' }}>
                <h2>Welcome { user.name }</h2>
                </div>

          <div style={{ textAlign: 'center', padding: '10px' }}>
            {
              captureVideo && modelsLoaded ?
                <button onClick={closeWebcam} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
                  Close Webcam
                </button>
                :
                <button onClick={startVideo} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
                  Open Webcam
                </button>
            }
            &nbsp;&nbsp;&nbsp;
                <button onClick={localSignOut} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
                  Sign Out
                </button>
          </div>
          {
            captureVideo ?
              modelsLoaded ?
                <div>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                    <video ref={videoRef} height={videoHeight} width={videoWidth} onPlay={handleVideoOnPlay} style={{ borderRadius: '10px' }} />
                    <canvas ref={canvasRef} style={{ position: 'absolute' }} />
                  </div>
                </div>
                :
                <div>loading...</div>
              :
              <>
              </>
          }
      </div>:
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <h2>Loading ...</h2>
        </div>
      }
    </div>
  );
}

export default EmotionDetector;

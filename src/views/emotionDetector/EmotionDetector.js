import * as faceapi from 'face-api.js';
import React from 'react';
import { collection, addDoc, serverTimestamp} from "firebase/firestore";
import { db } from '../../firebase';
import AuthSingleton from '../../services/AuthSingleton'; 

import { settings, TEST_WEBAPP_COLLECTION} from '../../Settings'
// import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';


function EmotionDetector({ signOut, currentUser }) {
  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  const [faceLandmarkerLoaded, setFaceLandmarkerLoaded] = React.useState(false);
  const [captureVideo, setCaptureVideo] = React.useState(false);
  const [intervalId, setIntervalId] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [faceLandmarker, setFaceLandmarker] = React.useState(null); // Initialize as null
  const [attentionLevel, setAttentionLevel] = React.useState(2); // Initialize as null

  const videoRef = React.useRef();
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = React.useRef();

  // var faceLandmarker
  let runningMode = "VIDEO";
  let score = -1;
  
  React.useEffect(() => {
    console.log("EmotionDetector AuthSingleton.isAuthenticated: " + AuthSingleton.isAuthenticated)
    if (AuthSingleton.isAuthenticated) {
      const user = AuthSingleton.getUser();
      setUser(user)
    } 
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
    
    const runModel = async () =>{
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
        console.error("error:", err);
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
  
        const interval = setInterval(async () => {
        
          await faceLandmarker.setOptions({ runningMode: runningMode });
          let nowInMs = Date.now();

          const results = faceLandmarker.detectForVideo(video, nowInMs);
          const face = results.faceLandmarks;
          console.log("face.length SCORE", face.length);
          
          const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

          if (detections.length < 0) return
          if (!detections[0]?.expressions) return

            // console.log('--- detections[0].expressions =', detections[0].expressions)
          const predominant =  Object.entries(detections[0].expressions).reduce((acc, [key, value]) => {
            if (value > acc.value) {
              return { key, value };
            }
            return acc;
          }, { key: null, value: -Infinity }).key

          console.log('--- predominant =', predominant)
          console.log("--- number of people: ", detections.length);
          var attention_level = attentionLevel
          if (face.length > 0) {
            const mesh = face[0];
            const eyes = results.faceBlendshapes[0];
            score = detectAttention(mesh, eyes);
    
            console.log("ATTENTION SCORE", score);
            attention_level = attentionMap(score);
            console.log("ATTENTION LEVEL", attention_level);
            setAttentionLevel(attention_level)
            
          }
          sendContextToFirebase(detections.length, attentionLevel);

          // if (canvasRef && canvasRef.current && canvasRef.current.getContext) {
          //   canvasRef.current.getContext('2d').clearRect(0, 0, videoWidth, videoHeight);
          //   //faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          //   faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
          //   faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
          //   // Dibujar solo el box mas grande
          //   const biggestDetection = biggestBox(resizedDetections)
          //   const box = biggestDetection.detection.box
          //   new faceapi.draw.DrawBox(box, {
          //       label: predominant
          //   }).draw(canvasRef.current) 
          // }
        }, settings.intervalTime);

        setIntervalId(interval);
      });
    }
  };

  const sendContextToFirebase = async (peopleNumber, attentionLevel) => {
    try {
      const data = {
        id_user: user.id,
        timestamp: serverTimestamp(),
        //interaction_others: peopleNumber >= 2 ? 1 : 0,
        attention_level: attentionLevel
      };
      // TODO: change "FaceDetectionTest" to "Emotions" after debug or test
      const docRef = await addDoc(collection(db, TEST_WEBAPP_COLLECTION), data);
  
      console.log('Context Document ID:', docRef.id);
    } catch (error) {
      console.error('Error adding document:', error);
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
    if (intervalId) {
      clearInterval(intervalId); // Clear the interval
      setIntervalId(null);
    }
    videoRef.current.pause();
    videoRef.current.srcObject = null;
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
                <h2>Welcome {user.name }</h2>
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

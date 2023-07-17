import * as faceapi from 'face-api.js';
import React from 'react';
import { collection, addDoc, Timestamp} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from '../firebase';
import { CONTEXT_WEB_COLLECTION, EMOTION_COLLECTION, settings } from '../Settings'

function EmotionDetector({ signOut, currentUser }) {
  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  const [captureVideo, setCaptureVideo] = React.useState(false);
  const [intervalId, setIntervalId] = React.useState(null);
  const [user, setUser] = React.useState(null);

  const videoRef = React.useRef();
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = React.useRef();

  React.useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const uid = user.uid;
        // ...
        console.log("uid", uid)
        setUser(user)
      } else {
        // User is signed out
        // ...
        console.log("user is logged out")
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
    loadModels();
    // setUser(currentUser);
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
    if (canvasRef && canvasRef.current) {
      const video = videoRef.current;
  
      video.addEventListener('loadeddata', () => {
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(video);
        const displaySize = {
          width: videoWidth,
          height: videoHeight
        };
  
        faceapi.matchDimensions(canvasRef.current, displaySize);
  
        const interval = setInterval(async () => {
          
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
          sendContextToFirebase(detections.length)
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
  
          if (canvasRef && canvasRef.current && canvasRef.current.getContext) {
            canvasRef.current.getContext('2d').clearRect(0, 0, videoWidth, videoHeight);
            //faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
            // Dibujar solo el box mas grande
            const biggestDetection = biggestBox(resizedDetections)
            const box = biggestDetection.detection.box
            new faceapi.draw.DrawBox(box, {
                label: predominant
            }).draw(canvasRef.current) 
          }
        }, settings.intervalTime);

        setIntervalId(interval);
      });
    }
  };

  function getBoxSize(detection) {
      const box = detection.detection.box
      var width = box.width
      var height = box.height
      return width * height
  }

  function biggestBox(resizedDetections) {
      var biggestDetection = resizedDetections[0];
      var biggestBox = 0;
      resizedDetections.forEach(detection => {
          var boxSize = getBoxSize(detection)
          if( boxSize > biggestBox ) {
              biggestDetection = detection
              biggestBox = boxSize
          }
      })
      console.log("Emotions: ",  biggestDetection.expressions)
            
      for (const [key, value] of Object.entries(biggestDetection.expressions)) {

        sendEmotionToFirebase(key, value)

      }

      return biggestDetection;
  }
  
  const sendEmotionToFirebase = async (emotion, value) => {
    try {
      const date = new Date();
      const data = {
        emotion: emotion,
        id_user: user.uid,
        source: "face",
        timestamp: Timestamp.fromDate(date),
        value: value
      };
      // TODO: change "FaceDetectionTest" to "Emotions" after debug or test
      const docRef = await addDoc(collection(db, EMOTION_COLLECTION), data);
  
      console.log('Emotion Document ID:', docRef.id);
    } catch (error) {
      console.error('Error adding document:', error);
    }
  };

  const sendContextToFirebase = async (peopleNumber) => {
    try {
      const date = new Date();
      const data = {
        id_user: user.uid,
        timestamp: Timestamp.fromDate(date),
        interaction_others: peopleNumber >= 2 ? 1 : 0,
        attention_level: -1
      };
      // TODO: change "FaceDetectionTest" to "Emotions" after debug or test
      const docRef = await addDoc(collection(db, CONTEXT_WEB_COLLECTION), data);
  
      console.log('Context Document ID:', docRef.id);
    } catch (error) {
      console.error('Error adding document:', error);
    }
  };

  const closeWebcam = () => {
    if (intervalId) {
      clearInterval(intervalId); // Clear the interval
      setIntervalId(null);
    }
    videoRef.current.pause();
    videoRef.current.srcObject = null;
    setCaptureVideo(false);
  }


  return (
    <div>
      {
        user ?
        <div>
          <div style={{ textAlign: 'center', padding: '10px' }}>
                <h2>Wellcome {user.displayName }</h2>
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
                <button onClick={signOut} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
                  SingOut
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

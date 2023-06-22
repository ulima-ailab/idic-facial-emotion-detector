import * as faceapi from 'face-api.js';
import React from 'react';
import { collection, addDoc, Timestamp} from "firebase/firestore";
import { db, auth } from '../firebase';
import { MAIN_COLLECTION, settings } from '../Settings'

function EmotionDetector({ signOut }) {
  const user = auth.currentUser;

  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  const [captureVideo, setCaptureVideo] = React.useState(false);
  const [intervalId, setIntervalId] = React.useState(null);

  const videoRef = React.useRef();
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = React.useRef();

  React.useEffect(() => {
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
            console.log(key, " ----", value)
            const date = new Date();

            const data = {
              emotion: key,
              id_user: user.uid,
              source: "face",
              timestamp: Timestamp.fromDate(date),
              value: value
            };
            addDataToFirestore(data)

            console.log('--- detection data =', data)
            
            if (value > acc.value) {
            return { key, value };
            }
            return acc;
          }, { key: null, value: -Infinity }).key
          

          console.log('--- predominant =', predominant)

          const resizedDetections = faceapi.resizeResults(detections, displaySize);
  
          if (canvasRef && canvasRef.current && canvasRef.current.getContext) {
            canvasRef.current.getContext('2d').clearRect(0, 0, videoWidth, videoHeight);
            faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
          }
        }, settings.intervalTime);

        setIntervalId(interval);

      });
    }
  };
  
  const addDataToFirestore = async (data) => {
    try {
      // TODO: change "FaceDetectionTest" to "Emotions" after debug or test
      console.log(MAIN_COLLECTION)
      const docRef = await addDoc(collection(db, MAIN_COLLECTION), data);
  
      console.log('Document ID:', docRef.id);
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
    videoRef.current.srcObject.getTracks()[0].stop();
    setCaptureVideo(false);
  }


  return (
    <div>
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <h2>Wellcome {user != null ? user.displayName : null }</h2>
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
    </div>
  );
}


export default EmotionDetector;

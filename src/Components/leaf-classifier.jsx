"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Camera,
  X,
  StopCircle,
  Download,
  RefreshCw,
  Upload,
  Loader2,
  FileUp,
  AlertCircle,
} from "lucide-react";

/**
 * LeafClassifier Component
 *
 * A component that handles leaf image classification through
 * both camera capture and file upload using the Roboflow API
 */
const LeafClassifier = () => {
  // File and image states
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [image, setImage] = useState(false);

  // API and results states
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Camera states
  const [stream, setStream] = useState(null);
  const [activeTab, setActiveTab] = useState("camera"); // "camera" or "upload"
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Refs for DOM elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  /**
   * Sends the image to the Roboflow API for classification
   */
  const sendFile = async (fileToProcess = null) => {
    const fileToSend = fileToProcess || selectedFile;

    if (!fileToSend) return;

    setIsLoading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        // Extract base64 data
        const base64Image = reader.result.split(",")[1];

        // Send to Roboflow API
        const response = await axios({
          method: "POST",
          url: "https://detect.roboflow.com/leaf-classification-xbz6a/2",
          params: {
            api_key: "ET93zUL2yyYqCxikJ6NV",
          },
          data: base64Image,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        // Find best prediction
        const predictions = response.data.predictions;
        let bestPrediction = null;
        let highestConfidence = 0;

        for (const [className, details] of Object.entries(predictions)) {
          if (details.confidence > highestConfidence) {
            highestConfidence = details.confidence;
            bestPrediction = {
              class: className,
              confidence: details.confidence,
            };
          }
        }

        // Set undefined if confidence is too low
        if (!bestPrediction || highestConfidence < 0.6) {
          bestPrediction = {
            class: "undefined",
            confidence: highestConfidence,
          };
        }

        console.log("Best Prediction:", bestPrediction);
        setData(bestPrediction);
      } catch (error) {
        console.error("Error analyzing image:", error);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsDataURL(fileToSend);
  };

  /**
   * Clears all data and resets the component
   */
  const clearData = () => {
    setData(null);
    setImage(false);
    setSelectedFile(null);
    setPreview(null);
  };

  /**
   * Starts the camera
   */
  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraReady(false);

      console.log("Starting camera...");

      // First check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in your browser");
      }

      // Try with basic constraints first
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (e) {
        console.warn("Failed with basic constraints, trying fallback:", e);
        // Fallback to more specific constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "environment", // Prefer back camera on mobile
          },
          audio: false,
        });
      }

      console.log("Camera stream obtained:", mediaStream);
      setStream(mediaStream);

      // Set up video element
      if (videoRef.current) {
        console.log("Setting video source...");
        videoRef.current.srcObject = mediaStream;

        // Add event listeners to detect when video is ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          videoRef.current
            .play()
            .then(() => {
              console.log("Video playing successfully");
              setCameraReady(true);
            })
            .catch((e) => {
              console.error("Error playing video:", e);
              setCameraError("Failed to play video stream: " + e.message);
            });
        };

        videoRef.current.onerror = (e) => {
          console.error("Video element error:", e);
          setCameraError(
            "Video element error: " + (e.message || "Unknown error")
          );
        };
      } else {
        console.error("Video ref is null");
        setCameraError("Video element not found");
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError(error.message || "Failed to access camera");
    }
  };

  /**
   * Stops the camera
   */
  const stopCamera = () => {
    console.log("Stopping camera...");
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      setStream(null);
      setCameraReady(false);

      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  /**
   * Captures an image from the video feed
   */
  const captureImage = () => {
    console.log("Capturing image...");
    if (!videoRef.current || !canvasRef.current) {
      console.error("Video or canvas ref is null");
      return false;
    }

    // Ensure video is playing and has dimensions
    if (videoRef.current.paused || videoRef.current.videoWidth === 0) {
      console.error("Video is not ready for capture");
      return false;
    }

    const context = canvasRef.current.getContext("2d");
    if (!context) {
      console.error("Could not get canvas context");
      return false;
    }

    // Set canvas dimensions to match video
    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;

    console.log("Video dimensions:", width, "x", height);

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    // Draw video frame to canvas
    try {
      context.drawImage(videoRef.current, 0, 0, width, height);
      console.log("Image captured successfully");
      return true;
    } catch (e) {
      console.error("Error drawing to canvas:", e);
      return false;
    }
  };

  /**
   * Processes the captured image and sends it for classification
   */
  const processImage = () => {
    console.log("Processing image...");
    if (!videoRef.current || !canvasRef.current) {
      console.error("Video or canvas ref is null");
      return;
    }

    // Capture the image
    const captureSuccess = captureImage();
    if (!captureSuccess) {
      console.error("Failed to capture image");
      return;
    }

    // Get data URL from canvas because we need to send it to the API
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      console.log("Data URL created");

      // Convert to blob
      const blob = dataURLtoBlob(dataUrl);
      console.log("Blob created:", blob.size, "bytes");

      // Update state and send for processing
      setSelectedFile(blob);
      setImage(true);
      setIsLoading(true);

      // Send to Roboflow API
      sendFile(blob);
    } catch (e) {
      console.error("Error processing captured image:", e);
    }
  };

  /**
   * Clears the captured image
   */
  const clearCapture = () => {
    console.log("Clearing capture...");
    if (!canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Also clear any results
    setData(null);
    setImage(false);
    setSelectedFile(null);
    setPreview(null);
  };

  /**
   * Downloads the captured image
   */
  const downloadImage = () => {
    console.log("Downloading image...");
    if (!canvasRef.current) return;

    // Check if canvas has content
    const isEmpty = isCanvasEmpty(canvasRef.current);
    if (isEmpty) {
      console.error("Canvas is empty, nothing to download");
      return;
    }

    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);

    const downloadLink = document.createElement("a");
    downloadLink.href = dataUrl;
    downloadLink.download = "leaf_image.jpeg";
    document.body.appendChild(downloadLink); // Needed for Firefox
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  /**
   * Checks if canvas is empty
   */
  const isCanvasEmpty = (canvas) => {
    const context = canvas.getContext("2d");
    const pixelBuffer = new Uint32Array(
      context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some((color) => color !== 0);
  };

  /**
   * Converts a data URL to a Blob
   */
  const dataURLtoBlob = (dataUrl) => {
    try {
      const arr = dataUrl.split(",");
      if (arr.length < 2) {
        throw new Error("Invalid data URL format");
      }

      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) {
        throw new Error("Could not extract MIME type");
      }

      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new Blob([u8arr], { type: mime });
    } catch (error) {
      console.error("Error converting data URL to blob:", error);
      return new Blob([], { type: "image/jpeg" }); // Return empty blob as fallback
    }
  };

  /**
   * Refreshes the page
   */
  const refreshPage = () => {
    // Stop camera before refreshing
    if (stream) {
      stopCamera();
    }
    window.location.reload();
  };

  /**
   * Handles file selection from input
   */
  const handleFileChange = (e) => {
    // check if there are files
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }

    // Check if the file is an image

    setSelectedFile(e.target.files[0]);
    setImage(true);
  };

  // Create preview when file changes
  useEffect(() => {
    // check if there is a file
    if (!selectedFile) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    // Automatically send file when selected
    sendFile();

    // Cleanup
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Auto-start camera when tab is selected
  useEffect(() => {
    if (activeTab === "camera" && !stream) {
      startCamera();
    }
  }, [activeTab]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-b from-emerald-50 to-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-emerald-800 mb-6 text-center">
        Leaf Classification System
      </h2>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg border border-emerald-200 p-1 bg-white shadow-sm">
          <button
            onClick={() => setActiveTab("camera")}
            className={`px-5 py-2 rounded-md flex items-center ${
              activeTab === "camera"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium"
                : "text-gray-600 hover:bg-emerald-50"
            } transition-all duration-200`}
          >
            <Camera
              className={`w-5 h-5 mr-2 ${
                activeTab === "camera" ? "text-white" : "text-emerald-500"
              }`}
            />
            Camera
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`px-5 py-2 rounded-md flex items-center ${
              activeTab === "upload"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium"
                : "text-gray-600 hover:bg-emerald-50"
            } transition-all duration-200`}
          >
            <Upload
              className={`w-5 h-5 mr-2 ${
                activeTab === "upload" ? "text-white" : "text-emerald-500"
              }`}
            />
            Upload
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="flex flex-wrap gap-8">
          {/* Left Section: Camera or Upload */}
          <div className="flex-1 min-w-[320px]">
            {activeTab === "camera" ? (
              // Camera Section
              stream ? (
                <div className="flex flex-col gap-6">
                  {/* Live Video Feed */}
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-emerald-100">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted // Important for autoplay to work on mobile
                      className="w-full h-auto block bg-gradient-to-r from-emerald-50 to-teal-50 min-h-[240px]"
                      style={{ display: "block" }} // Force display block
                    />
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-5 py-1.5 rounded-full font-bold shadow-sm text-emerald-700 border border-emerald-100">
                      Live Feed {cameraReady ? "✓" : "..."}
                    </div>

                    {/* Camera loading overlay */}
                    {!cameraReady && (
                      <div className="absolute inset-0 bg-emerald-50/50 flex items-center justify-center">
                        <div className="bg-white p-3 rounded-lg shadow-md flex items-center">
                          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin mr-2" />
                          <span className="text-emerald-700">
                            Initializing camera...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Captured Image Canvas */}
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-emerald-100">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto block bg-gradient-to-r from-emerald-50 to-teal-50 min-h-[240px]"
                    />
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-5 py-1.5 rounded-full font-bold shadow-sm text-emerald-700 border border-emerald-100">
                      Captured Image
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      onClick={processImage}
                      disabled={!cameraReady}
                      className={`flex flex-col items-center p-4 ${
                        cameraReady
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-200 active:scale-95"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      } rounded-xl cursor-pointer transition-all duration-300`}
                    >
                      <Camera className="mb-1.5 w-6 h-6" />
                      <span className="font-medium">Capture</span>
                    </button>

                    <button
                      onClick={clearCapture}
                      className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 active:scale-95"
                    >
                      <X className="mb-1.5 w-6 h-6 text-gray-600" />
                      <span className="font-medium text-gray-700">Clear</span>
                    </button>

                    <button
                      onClick={stopCamera}
                      className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 active:scale-95"
                    >
                      <StopCircle className="mb-1.5 w-6 h-6 text-red-500" />
                      <span className="font-medium text-gray-700">Stop</span>
                    </button>

                    <button
                      onClick={downloadImage}
                      className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 active:scale-95"
                    >
                      <Download className="mb-1.5 w-6 h-6 text-blue-500" />
                      <span className="font-medium text-gray-700">
                        Download
                      </span>
                    </button>

                    <button
                      onClick={refreshPage}
                      className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 active:scale-95"
                    >
                      <RefreshCw className="mb-1.5 w-6 h-6 text-purple-500" />
                      <span className="font-medium text-gray-700">Reload</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-[400px] bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-dashed border-emerald-200 shadow-inner">
                  <div className="text-center p-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white flex items-center justify-center shadow-md">
                      <Camera className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-800 mb-3">
                      Camera Access Required
                    </h3>
                    <p className="text-gray-600 mb-5 max-w-xs">
                      Click the button below to enable your camera and start
                      capturing leaf images
                    </p>

                    {cameraError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Camera Error</p>
                          <p className="text-sm">{cameraError}</p>
                          <p className="text-sm mt-1">
                            Please ensure you've granted camera permissions and
                            try again.
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={startCamera}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-full cursor-pointer text-base hover:shadow-lg hover:shadow-emerald-200 transition-all duration-300 active:scale-95"
                    >
                      Start Camera
                    </button>
                  </div>
                </div>
              )
            ) : (
              // Upload Section
              <div
                className="relative border-2 border-dashed border-emerald-200 rounded-xl p-8 bg-gradient-to-r from-emerald-50 to-teal-50 cursor-pointer hover:border-emerald-300 transition-colors h-[400px] flex items-center justify-center"
                onClick={() => document.getElementById("file-upload").click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-md">
                    <Upload className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                    Upload Leaf Image
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Click or drag and drop an image to classify
                  </p>
                  <button className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-full cursor-pointer text-base hover:shadow-lg hover:shadow-emerald-200 transition-all duration-300 active:scale-95 flex items-center">
                    <FileUp className="w-5 h-5 mr-2" />
                    Select Image
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Results */}
          <div className="flex-1 min-w-[320px]">
            <div className="relative h-full rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-lg min-h-[500px]">
              {preview ? (
                <div className="p-6 flex flex-col gap-5">
                  {/* Preview Image */}
                  <div className="w-full rounded-xl overflow-hidden shadow-md border border-emerald-50">
                    <img
                      src={preview || "/placeholder.svg"}
                      alt="Captured"
                      className="w-full h-auto block object-cover"
                    />
                  </div>

                  {/* Results Display */}
                  {data && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl shadow-sm border border-emerald-100">
                      <h3 className="text-lg font-semibold text-emerald-800 mb-3">
                        Analysis Results
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <p className="text-sm text-emerald-600 font-medium mb-1">
                            Classification:
                          </p>
                          <p className="text-xl font-bold text-emerald-900 capitalize">
                            {data.class}
                          </p>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm text-emerald-600 font-medium mb-1">
                            Confidence:
                          </p>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full"
                                style={{
                                  width: `${(data.confidence * 100).toFixed(
                                    2
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <p className="text-xl font-bold text-emerald-900">
                              {(data.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clear Button */}
                  {data && (
                    <button
                      onClick={clearData}
                      className="flex items-center justify-center py-3 px-5 bg-white border border-gray-200 rounded-xl cursor-pointer mt-2 hover:bg-gray-50 transition-colors shadow-sm active:scale-98"
                    >
                      <X className="w-5 h-5 mr-2 text-gray-600" />
                      <span className="font-medium text-gray-700">
                        Clear Results
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <Camera className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-emerald-800 mb-2">
                    Ready to Analyze
                  </h3>
                  <p className="text-gray-600 max-w-xs">
                    {activeTab === "camera"
                      ? "Capture a leaf image using the camera to begin the classification process"
                      : "Upload a leaf image to begin the classification process"}
                  </p>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-t-2 border-emerald-200 animate-ping opacity-20"></div>
                  </div>
                  <p className="text-emerald-800 font-medium mt-4">
                    Analyzing image...
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    This may take a few moments
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeafClassifier;

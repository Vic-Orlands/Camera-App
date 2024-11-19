import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
} from "react-native";
import {
  Camera,
  Frame,
  CameraDevice,
  useCodeScanner,
  useCameraDevice,
  useCameraDevices,
  useFrameProcessor,
  useCameraPermission,
} from "react-native-vision-camera";
import {
  CameraRoll,
  PhotoIdentifier,
  useCameraRoll,
} from "@react-native-camera-roll/camera-roll";
import * as FileSystem from "expo-file-system";
import { Worklets } from "react-native-worklets-core";
import { Entypo, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import ImageLabeling from "@react-native-ml-kit/image-labeling";

const myFunction = async (frame: string) => {
  try {
    const labels = await ImageLabeling.label(frame);
    console.log("labels:", labels);
    return labels.map((label) => console.log("text:", label.text));
  } catch (error) {
    console.error("Error during image labeling:", error);
    return [];
  }
};

export default function HomeScreen() {
  const cameraRef = useRef<Camera>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [toggleFrontCamera, setToggleFrontCamera] = useState(false);
  const device = useCameraDevice(toggleFrontCamera ? "front" : "back");
  // const devices = useCameraDevices();
  // const device = useMemo(() => findBestDevice(devices), [devices]);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const [grantPermission, setGrantPermission] = useState<boolean>(false);
  const [showPhoto, setShowPhoto] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [gallery, setGallery] = useState<PhotoIdentifier[]>([]);
  const [photos, getPhotos, save] = useCameraRoll();
  const [turnOnFlash, setTurnOnFlash] = useState<boolean>(false);
  const [toggleVideoRecorder, setToggleVideoRecorder] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);

  useEffect(() => {
    if (hasPermission && grantPermission) {
      setGrantPermission(true);
    } else {
      requestPermission().then(() => setGrantPermission(grantPermission));
    }
  }, [hasPermission, grantPermission]);

  async function hasAndroidPermission() {
    const getCheckPermissionPromise = () => {
      if (Number(Platform.Version) >= 33) {
        return Promise.all([
          PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          ),
          PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
          ),
        ]).then(
          ([hasReadMediaImagesPermission, hasReadMediaVideoPermission]) =>
            hasReadMediaImagesPermission && hasReadMediaVideoPermission
        );
      } else {
        return PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
      }
    };

    const hasPermission = await getCheckPermissionPromise();
    if (hasPermission) {
      return true;
    }
    const getRequestPermissionPromise = () => {
      if (Number(Platform.Version) >= 33) {
        return PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ]).then(
          (statuses) =>
            statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
              PermissionsAndroid.RESULTS.GRANTED &&
            statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] ===
              PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        return PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        ).then((status) => status === PermissionsAndroid.RESULTS.GRANTED);
      }
    };

    return await getRequestPermissionPromise();
  }

  // function findBestDevice(devices: CameraDevice[] | null): CameraDevice | null {
  //   if (!devices || devices.length === 0) {
  //     return null;
  //   }

  //   const backCameras = devices.filter((device) => device.position === "back");
  //   const frontCameras = devices.filter(
  //     (device) => device.position === "front"
  //   );

  //   if (backCameras.length > 0) {
  //     const bestBackCamera = backCameras.sort(
  //       (a, b) => b.width * b.height - a.width * a.height
  //     )[0];
  //     return bestBackCamera;
  //   }

  //   if (frontCameras.length > 0) {
  //     return frontCameras[0];
  //   }

  //   return null;
  // }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (showPhoto) {
      timeoutId = setTimeout(() => {
        setShowPhoto(false);
      }, 3000);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showPhoto]);

  useEffect(() => {
    const getGallery = () => {
      CameraRoll.getPhotos({
        first: 1,
        assetType: "Photos",
      })
        .then((photo) => {
          setGallery(photo.edges);
        })
        .catch((err) => {
          console.error(err);
        });
    };
    getGallery();

    return () => getGallery();
  }, []);

  const toggleFlash = () => {
    setTurnOnFlash((prev) => !prev);
  };

  const toggleCamera = () => {
    setToggleFrontCamera((prev) => !prev);
  };

  const takePhoto = async () => {
    if (Platform.OS === "android" && !(await hasAndroidPermission())) {
      return;
    }

    if (cameraRef.current) {
      const { path } = await cameraRef.current.takePhoto({
        flash: turnOnFlash ? "on" : "off",
        enableShutterSound: true,
      });
      await CameraRoll.saveAsset(`file://${path}`, {
        type: "photo",
      });

      setPhotoUri(path);
      setShowPhoto(true);
    } else {
      Alert.alert("Camera not ready");
    }
  };

  const openGallery = async () => {
    CameraRoll.getPhotos({
      first: 20,
      assetType: "Photos",
    })
      .then(({ edges }) => {
        setGallery(edges);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        if (isRecording) {
          await cameraRef.current.stopRecording();
          setIsRecording(false);

          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        } else {
          cameraRef.current.startRecording({
            flash: turnOnFlash ? "on" : "off",
            onRecordingError: (error) =>
              console.error("Recording error:", error),
            onRecordingFinished: async ({ path }) => {
              try {
                // await save(`file://${path}`, { type: "video" }); // if you want to use the useCameraRoll hook
                await CameraRoll.saveAsset(`file://${path}`, { type: "video" });
              } catch (error) {
                console.error("Error saving video:", error);
              }
              setIsRecording(false);
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
            },
          });
          setIsRecording(true);

          setVideoTimer(0);
          timerRef.current = setInterval(() => {
            setVideoTimer((prevTime) => prevTime + 1);
          }, 1000);
        }
      } catch (error) {
        console.error("Error during recording:", error);
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13", "upc-a"],
    onCodeScanned: (codes) => {
      for (const code of codes) {
        console.log(`Scanned ${code.type}: ${code.frame}, ${code.value}`);
      }
    },
  });

  const myFunctionJS = Worklets.createRunOnJS(myFunction);
  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";

    const takeSnapshot = async () => {
      try {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takeSnapshot({
            quality: 85,
          });
          console.log(photo);

          const imageAsBase64 = await FileSystem.readAsStringAsync(photo.path, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log(imageAsBase64);

          myFunctionJS(imageAsBase64);
        }
      } catch (error) {
        console.log("Error converting Image:", error);
      }
    };
    takeSnapshot()

    // Worklets.runOnJS(takeSnapshot);
  }, []);

  if (!hasPermission || !device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {photos.edges.length > 0 ? (
        <ScrollView>
          <SafeAreaView style={styles.galleryGrid}>
            {photos.edges.map((item, index) => {
              return (
                <Image
                  key={index}
                  style={styles.galleryPhotos}
                  source={{ uri: item.node.image.uri }}
                />
              );
            })}
          </SafeAreaView>
        </ScrollView>
      ) : (
        <>
          <Camera
            ref={cameraRef}
            photo={!toggleVideoRecorder}
            video={toggleVideoRecorder}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={!!device}
            pixelFormat="yuv"
            audio={toggleVideoRecorder}
            // codeScanner={codeScanner}
            enableZoomGesture={true}
            torch={turnOnFlash ? "on" : "off"}
            frameProcessor={!toggleVideoRecorder ? undefined : frameProcessor}
          />

          {showPhoto && photoUri && (
            <View style={styles.photoOverlay}>
              <Image
                source={{ uri: `file://${photoUri}` }}
                style={styles.photoImage}
              />
            </View>
          )}

          {isRecording && (
            <Text style={styles.videoTimer}>{formatTime(videoTimer)}</Text>
          )}

          <TouchableOpacity style={styles.flash} onPress={toggleFlash}>
            <Entypo
              name="flash"
              size={40}
              color={turnOnFlash ? "yellow" : "rgba(255, 255, 255, 0.4)"}
            />
          </TouchableOpacity>

          <View style={styles.textOverlayView}>
            <TouchableOpacity onPress={() => setToggleVideoRecorder(false)}>
              <Text
                style={[
                  styles.textOverlayText,
                  !toggleVideoRecorder && {
                    borderWidth: 1,
                    borderColor: "#fff",
                    borderRadius: 6,
                  },
                ]}
              >
                Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setToggleVideoRecorder(true)}>
              <Text
                style={[
                  styles.textOverlayText,
                  toggleVideoRecorder && {
                    borderWidth: 1,
                    borderColor: "#fff",
                    borderRadius: 6,
                  },
                ]}
              >
                Video
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlsView}>
            {gallery.length > 0 ? (
              gallery.splice(0, 1).map((item, index) => {
                return (
                  <Pressable onPress={() => getPhotos()} key={index}>
                    <Image
                      style={styles.photogallery}
                      source={{ uri: item.node.image.uri }}
                    />
                  </Pressable>
                );
              })
            ) : (
              <Pressable
                // onPress={openGallery}
                onPress={() => {
                  getPhotos();
                  console.log(photos.edges);
                }}
              >
                <Image
                  style={styles.photogallery}
                  source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }}
                />
              </Pressable>
            )}

            {toggleVideoRecorder ? (
              <TouchableOpacity
                onPress={startRecording}
                style={styles.takePhoto}
              >
                <View
                  style={[styles.takePhotoButton, { backgroundColor: "red" }]}
                ></View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={takePhoto} style={styles.takePhoto}>
                <View style={styles.takePhotoButton}></View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={toggleCamera}
              style={styles.toggleCamera}
            >
              {/* <View style={styles.toggleCameraButton}></View> */}
              <MaterialIcons name="cameraswitch" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const deviceWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    paddingBottom: 50,
  },
  galleryPhotos: {
    width: deviceWidth / 3 - 1,
    height: 150,
    borderWidth: 2,
    borderColor: "#fff",
    marginVertical: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    borderRadius: 8,
  },
  videoTimer: {
    position: "absolute",
    top: 50,
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  flash: {
    position: "absolute",
    top: 80,
    right: 20,
  },
  textOverlayView: {
    position: "absolute",
    top: 80,
    left: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: 100,
  },
  textOverlayText: {
    fontSize: 20,
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  controlsView: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 30,
    width: deviceWidth,
  },
  photogallery: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  takePhoto: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: "#fff",
    padding: 4,
  },
  takePhotoButton: {
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#fff",
    borderRadius: 50,
    width: "100%",
    height: "100%",
  },
  toggleCamera: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    width: 60,
  },
  photoContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 10,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 80,
    left: 20,
    width: 140,
    height: 170,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fff",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
});

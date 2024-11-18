import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  Dimensions,
  Pressable,
  ScrollView,
} from "react-native";
import {
  Camera,
  CameraDevice,
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
} from "react-native-vision-camera";
import {
  CameraRoll,
  PhotoIdentifier,
} from "@react-native-camera-roll/camera-roll";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const cameraRef = useRef<Camera>(null);
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

    // Cleanup timeout when component unmounts or showPhoto changes
    return () => {
      clearTimeout(timeoutId);
    };
  }, [showPhoto]);

  const turnOnFlash = () => {
    // setTurnOnFlash((prev) => !prev);
  };

  const toggleCamera = () => {
    setToggleFrontCamera((prev) => !prev);
  };

  const takePhoto = async () => {
    if (Platform.OS === "android" && !(await hasAndroidPermission())) {
      return;
    }

    if (cameraRef.current) {
      const photo = await cameraRef.current.takePhoto({
        // flash: "on",
        enableShutterSound: true,
      });
      await CameraRoll.saveAsset(`file://${photo.path}`, {
        type: "photo",
      });
      console.log(photo);

      setPhotoUri(photo.path);
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
      .then((photo) => {
        setGallery(photo.edges);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const startRecording = async () => {
    // if (cameraRef.current) {
    //   try {
    //     const video = await cameraRef.current.startRecording({
    //       onRecordingError: (error) => console.error("Recording error:", error),
    //       onRecordingFinished: (video) => {
    //         console.log("Recording finished:", video);
    //         setIsRecording(false);
    //       },
    //     });
    //     setIsRecording(true);
    //     console.log("Recording started:", video);
    //   } catch (error) {
    //     console.error("Error starting recording:", error);
    //   }
    // }
  };

  const stopRecording = async () => {
    // if (cameraRef.current && isRecording) {
    //   const video = await cameraRef.current.stopRecording();
    //   console.log("Recording stopped:", video);
    //   setIsRecording(false);
    // }
  };

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
      {gallery.length > 0 ? (
        <ScrollView>
          <SafeAreaView style={styles.galleryGrid}>
            {gallery.map((item, index) => {
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
            photo={true}
            video={true}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
          />

          {showPhoto && photoUri && (
            <View style={styles.photoOverlay}>
              <Image
                source={{ uri: `file://${photoUri}` }}
                style={styles.photoImage}
              />
            </View>
          )}

          <View style={styles.controlsView}>
            <Pressable onPress={openGallery}>
              <Image
                source={{ uri: `file://${photoUri}` }}
                style={styles.photogallery}
              />
            </Pressable>

            <TouchableOpacity onPress={takePhoto} style={styles.takePhoto}>
              <View style={styles.takePhotoButton}></View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleCamera}
              style={styles.toggleCamera}
            >
              <View style={styles.toggleCameraButton}></View>
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
    // backgroundColor: "black",
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
    padding: 12,
    height: 60,
    width: 60,
  },
  toggleCameraButton: {
    borderRadius: 50,
    borderColor: "#fff",
    borderWidth: 1,
    width: "100%",
    height: "100%",
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

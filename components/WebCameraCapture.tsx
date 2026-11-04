import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Text from './ui/Text';

/**
 * Browser camera capture for Premium Scan.
 *
 * `expo-image-picker`'s `launchCameraAsync` on web is a hidden
 * `<input type="file" capture="environment">`. A phone browser turns that into
 * the camera, but a desktop browser ignores `capture` and shows the file
 * manager — so "Take photo" quietly became "pick an existing photo".
 *
 * This asks the browser for the real camera stream instead, shows a live
 * preview, and grabs one frame as a JPEG data URL. The upload path already
 * reads `picked.uri` with `fetch()` on web, so a data URL flows through it
 * unchanged.
 *
 * It deliberately does not pretend: when there is no camera, no permission, or
 * the page is not a secure context, it says so and offers the file picker.
 */

const IS_WEB = Platform.OS === 'web';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** JPEG data URL of the captured frame. */
  onCaptured: (dataUrl: string) => void;
  /** Fall back to choosing an existing photo. */
  onChooseFile: () => void;
}

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera permission was denied. Allow camera access in the browser site settings, or choose an existing photo.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device. Choose an existing photo instead.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is already in use by another app. Close it and try again, or choose an existing photo.';
  }
  const detail = error instanceof Error ? error.message : String(error);
  return `The camera could not start (${detail}). Choose an existing photo instead.`;
}

export default function WebCameraCapture({ visible, onClose, onCaptured, onChooseFile }: Props) {
  const host = useRef<ComponentRef<typeof View>>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    try {
      stream.current?.getTracks().forEach((track) => track.stop());
    } catch {
      /* a dead stream needs no cleanup */
    }
    stream.current = null;
    if (video.current) {
      try {
        video.current.srcObject = null;
      } catch {
        /* the element may already be detached */
      }
      video.current.remove();
      video.current = null;
    }
    setReady(false);
  }, []);

  useEffect(() => {
    if (!IS_WEB || !visible) return;
    let cancelled = false;

    const node = host.current as unknown as HTMLElement | null;
    if (!node || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(
        typeof navigator !== 'undefined' && !navigator.mediaDevices
          ? 'This browser only allows camera access on a secure (https or localhost) page. Choose an existing photo instead.'
          : 'This browser cannot open a camera. Choose an existing photo instead.'
      );
      return;
    }

    setError(null);
    setReady(false);

    const element = document.createElement('video');
    element.autoplay = true;
    element.muted = true;
    element.playsInline = true;
    element.setAttribute('playsinline', 'true');
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'cover';
    element.style.display = 'block';
    node.appendChild(element);
    video.current = element;

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        element.srcObject = media;
        return element.play().then(() => {
          if (!cancelled) setReady(true);
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(cameraErrorMessage(e));
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [visible, stop]);

  const capture = useCallback(() => {
    const element = video.current;
    if (!element) return;
    const width = element.videoWidth;
    const height = element.videoHeight;
    if (!width || !height) {
      setError('The camera is still warming up — give it a second, then tap Capture.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('This browser cannot read the camera frame. Choose an existing photo instead.');
      return;
    }
    context.drawImage(element, 0, 0, width, height);
    // 0.82 keeps printed notes legible well under the 6 MB OCR ceiling.
    onCaptured(canvas.toDataURL('image/jpeg', 0.82));
  }, [onCaptured]);

  if (!IS_WEB) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Scan your notes</Text>
          <Text style={styles.hint}>
            {error ? 'The camera is not available here.' : 'Fill the frame with the page, then tap Capture.'}
          </Text>

          <View style={styles.preview}>
            <View ref={host} style={styles.videoHost} />
            {!ready && !error ? (
              <View style={styles.overlay}>
                <Text style={styles.overlayText}>Starting the camera…</Text>
              </View>
            ) : null}
          </View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <View style={styles.actions}>
            {!error ? (
              <Pressable
                onPress={capture}
                disabled={!ready}
                style={({ pressed }) => [
                  styles.primary,
                  { opacity: !ready ? 0.45 : pressed ? 0.92 : 1 },
                ]}
              >
                <Text style={styles.primaryText}>Capture</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onChooseFile} style={styles.secondary}>
              <Text style={styles.secondaryText}>Choose a photo instead</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 6, 0.78)',
    padding: 18,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 22,
    backgroundColor: '#10150D',
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F7FBF2',
  },
  hint: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: '#9FB08F',
  },
  preview: {
    marginTop: 12,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#050705',
  },
  videoHost: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C9D8BC',
  },
  error: {
    marginTop: 10,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: '#F2A0A0',
  },
  actions: {
    marginTop: 14,
    gap: 8,
  },
  primary: {
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#C7E36B',
    paddingVertical: 13,
  },
  primaryText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#14200A',
  },
  secondary: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#33402A',
    paddingVertical: 12,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E4EEDB',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#8D9C81',
  },
});

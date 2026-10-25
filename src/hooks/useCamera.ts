export async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw new Error(
      "Câmera indisponível. Use um navegador compatível em HTTPS ou localhost.",
    );
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  } catch (e) {
    if (
      e instanceof DOMException &&
      ["OverconstrainedError", "NotReadableError"].includes(e.name)
    )
      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
    throw e;
  }
}
export function cameraError(e: unknown) {
  if (e instanceof DOMException) {
    if (e.name === "NotAllowedError")
      return "Permissão de câmera negada. Libere a câmera nas configurações do navegador e tente novamente.";
    if (e.name === "NotFoundError")
      return "Nenhuma webcam encontrada. Conecte uma câmera e tente novamente.";
    if (e.name === "NotReadableError")
      return "A webcam está ocupada ou indisponível. Feche outros aplicativos que usam a câmera.";
  }
  return e instanceof Error ? e.message : "Não foi possível iniciar a câmera.";
}

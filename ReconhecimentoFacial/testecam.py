<<<<<<< HEAD
import cv2

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
if not cap.isOpened():
    print("Erro: Não foi possível abrir a câmera.")
else:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Erro: Falha na captura do frame.")
            break
        cv2.imshow('Teste', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()
=======
import cv2

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
if not cap.isOpened():
    print("Erro: Não foi possível abrir a câmera.")
else:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Erro: Falha na captura do frame.")
            break
        cv2.imshow('Teste', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()
>>>>>>> 6daa08bdde42529ba3ed0144e824fdba1b0a1266

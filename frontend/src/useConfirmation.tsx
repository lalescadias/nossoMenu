import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "./ui";

export function useConfirmation() {
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useRef<((confirmed: boolean) => void) | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    const pending = resolve.current;
    resolve.current = null;
    setMessage(null);
    pending?.(confirmed);
  }, []);

  useEffect(
    () => () => {
      resolve.current?.(false);
      resolve.current = null;
    },
    [],
  );

  const confirm = useCallback((text: string) => {
    resolve.current?.(false);
    setMessage(text);
    return new Promise<boolean>((complete) => {
      resolve.current = complete;
    });
  }, []);

  const confirmationModal =
    message !== null &&
    createPortal(
      <Modal title="Confirmar ação" onClose={() => finish(false)}>
        <p>{message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            autoFocus
            onClick={() => finish(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => finish(true)}
          >
            Confirmar
          </button>
        </div>
      </Modal>,
      document.body,
    );

  return { confirm, confirmationModal };
}

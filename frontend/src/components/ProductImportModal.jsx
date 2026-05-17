/**
 * Importação de produtos a partir de ficheiro (parse e pré-visualização antes de gravar).
 */
import { useCallback, useEffect, useRef, useState } from "react";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Modal de importação de planilha — etapas: vazio → carregando (barra %) → pronto (Importar ativo).
 */
export default function ProductImportModal({ open, onClose, onImported }) {
  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | ready
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setFile(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [clearTimers]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const runProgressSimulation = useCallback(() => {
    clearTimers();
    setProgress(0);
    setPhase("loading");

    const t0 = Date.now();
    const totalMs = 2200;
    const pauseAt = 0.5;

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      let p;
      if (elapsed < totalMs * pauseAt) {
        p = Math.round((elapsed / (totalMs * pauseAt)) * 50);
      } else if (elapsed < totalMs) {
        const t2 = (elapsed - totalMs * pauseAt) / (totalMs * (1 - pauseAt));
        p = 50 + Math.round(t2 * 50);
      } else {
        p = 100;
        clearTimers();
        setProgress(100);
        setPhase("ready");
        return;
      }
      setProgress(Math.min(100, p));
    }, 40);
  }, [clearTimers]);

  const handlePickFile = useCallback(
    (picked) => {
      const f = picked?.[0];
      if (!f) return;
      setFile(f);
      runProgressSimulation();
    },
    [runProgressSimulation]
  );

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handlePickFile(e.dataTransfer?.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const removeFile = () => {
    reset();
  };

  const handleImportClick = () => {
    if (phase !== "ready" || !file) return;
    onImported?.(file);
    reset();
    onClose?.();
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  if (!open) return null;

  return (
    <>
      <div className="products-import-modal__backdrop" role="presentation" onClick={handleClose} />
      <div className="products-import-modal" role="dialog" aria-modal="true" aria-labelledby="products-import-title">
        <div className="products-import-modal__dialog">
          <header className="products-import-modal__header">
            <h2 id="products-import-title" className="products-import-modal__title">
              Importar Planilha - Produtos
            </h2>
            <button type="button" className="products-import-modal__close-red" onClick={handleClose} aria-label="Fechar">
              <i className="ri-close-line" aria-hidden />
            </button>
          </header>

          <div className="products-import-modal__body">
            <input
              ref={fileInputRef}
              type="file"
              className="products-import-modal__file-input"
              accept=".csv,.xlsx,.xls"
              tabIndex={-1}
              onChange={(e) => handlePickFile(e.target.files)}
            />

            {phase === "idle" ? (
              <div
                className="products-import-modal__dropzone"
                onDrop={onDrop}
                onDragOver={onDragOver}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openFilePicker();
                  }
                }}
              >
                <i className="ri-file-text-line products-import-modal__doc-icon" aria-hidden />
                <p className="products-import-modal__hint">Arraste e solte aqui</p>
                <p className="products-import-modal__or">ou</p>
                <button type="button" className="products-import-modal__link-btn" onClick={openFilePicker}>
                  Abrir Arquivos
                </button>
              </div>
            ) : (
              <div className="products-import-modal__dropzone products-import-modal__dropzone--with-file">
                <div className="products-import-modal__file-row">
                  <i className="ri-file-text-line products-import-modal__file-row-icon" aria-hidden />
                  <div className="products-import-modal__file-meta">
                    <span className="products-import-modal__file-name">{file?.name}</span>
                    <span className="products-import-modal__file-size">{file ? formatFileSize(file.size) : ""}</span>
                  </div>
                  <button
                    type="button"
                    className="products-import-modal__trash"
                    onClick={removeFile}
                    aria-label="Remover arquivo"
                    title="Remover"
                  >
                    <i className="ri-delete-bin-line" aria-hidden />
                  </button>
                </div>
                {phase === "loading" ? (
                  <div className="products-import-modal__progress-row">
                    <div className="products-import-modal__progress-track">
                      <div className="products-import-modal__progress-fill" style={{ width: `${progress}%` }}>
                        <span className="products-import-modal__progress-pct">{progress} %</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <footer className="products-import-modal__footer">
            <button
              type="button"
              className="products-import-modal__submit"
              disabled={phase !== "ready"}
              onClick={handleImportClick}
            >
              Importar
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}

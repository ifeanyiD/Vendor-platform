import React, { useEffect, useCallback } from 'react';
import { createPortal } from "react-dom";
import './Lightbox.scss';

export default function Lightbox({ images, currentIndex, onClose, onPrev, onNext }) {
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  const API_BASE =  'http://localhost:5000/api'.replace('/api', '');

  return createPortal (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox__close" onClick={onClose} aria-label="Close">✕</button>

      {images.length > 1 && (
        <>
          <button
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="Previous"
          >‹</button>
          <button
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="Next"
          >›</button>
        </>
      )}

      <div className="lightbox__img-wrap" onClick={e => e.stopPropagation()}>
        <img
          src={images[currentIndex]?.startsWith('/')
            ? `${API_BASE}${images[currentIndex]}`
            : images[currentIndex]}
          alt={`Product ${currentIndex + 1}`}
        />
      </div>

      {images.length > 1 && (
        <div className="lightbox__dots">
          {images.map((_, i) => (
            <button
              key={i}
              className={`lightbox__dot ${i === currentIndex ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); /* parent handles via index */ }}
            />
          ))}
        </div>
      )}

      <p className="lightbox__counter">{currentIndex + 1} / {images.length}</p>
    </div>,
    document.body
  );
}

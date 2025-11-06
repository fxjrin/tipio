import { useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import gsap from 'gsap';

export default function QRModal({ isOpen, onClose, qrDataUrl, username, onDownload }) {
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current && contentRef.current) {
      // Reset initial state
      gsap.set(modalRef.current, { opacity: 0, display: 'flex' });
      gsap.set(contentRef.current, { scale: 0.8, opacity: 0 });

      // Animate in
      const tl = gsap.timeline();
      tl.to(modalRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out'
      })
      .to(contentRef.current, {
        scale: 1,
        opacity: 1,
        duration: 0.3,
        ease: 'back.out(1.7)'
      }, '-=0.1');
    }
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current && contentRef.current) {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(modalRef.current, { display: 'none' });
          onClose();
        }
      });

      tl.to(contentRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      })
      .to(modalRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: 'power2.in'
      }, '-=0.1');
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleClose}
      style={{ display: 'none' }}
    >
      <div
        ref={contentRef}
        className="relative bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal</h2>
          <p className="text-sm text-gray-600 mb-6">Scan to open payment link</p>

          {/* QR Code */}
          <div className="inline-block p-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl mb-6">
            <div className="bg-white p-4 rounded-2xl">
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            </div>
          </div>

          {/* Link */}
          <div className="mb-6 p-3 bg-gray-50 rounded-xl">
            <p className="text-sm font-mono text-gray-700">
              https://tipio.io/{username}
            </p>
          </div>

          {/* Download Button */}
          <Button
            onClick={onDownload}
            className="w-full bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90"
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>

          {/* Branding */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">tipio</span>
          </div>
        </div>
      </div>
    </div>
  );
}

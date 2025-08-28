import { FaRegSmileBeam, FaRegFrownOpen } from "react-icons/fa";
import { useState, useEffect } from "react";

export function ModalWinLose({ isWin, onClose }: { isWin: boolean|null, onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isWin !== null) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isWin]);
  if (isWin === null && !visible) return null;
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${isWin !== null && visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }}
      style={{ transitionProperty: 'opacity, filter' }}
    >
      <div className={`flex flex-col items-center justify-center transform transition-transform duration-300 ${isWin !== null && visible ? 'scale-100' : 'scale-90'}`}>
        {isWin === true ? (
          <div className="flex flex-col items-center">
            <FaRegSmileBeam className="text-green-400" style={{ fontSize: 120 }} />
            <div className="mt-6 text-4xl font-bold text-green-200 drop-shadow-lg animate-pulse">You won!</div>
          </div>
        ) : isWin === false ? (
          <div className="flex flex-col items-center">
            <FaRegFrownOpen className="text-red-400" style={{ fontSize: 120 }} />
            <div className="mt-6 text-4xl font-bold text-red-200 drop-shadow-lg animate-pulse">You lost</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import React from "react";
import { GameWallet } from "./GameWallet";
import ReferralWidget from "./ReferralWidget";

const BottomWidgets = () => {
  return (
    <div style={{
      position: "fixed",
      right: 32,
      bottom: 32,
      zIndex: 50,
      display: "flex",
      gap: 16,
      alignItems: "center"
    }}>
      <GameWallet />
      <ReferralWidget />
    </div>
  );
};

export default BottomWidgets;

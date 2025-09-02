import React from "react";
import "./grumpyWombatCheckbox.css";

type Props = {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const GrumpyWombatCheckbox: React.FC<Props> = ({ checked, onChange }) => (
  <label className="container">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <div className="checkmark">
      <p className="No name">Main Wallet</p>
      <p className="Yes name">Game Wallet</p>
    </div>
  </label>
);

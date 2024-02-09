import "./App.css";
import { ExcelToJsonConverter } from "./ExcelToJsonConverter";

function App() {
  return (
    <div className="container">
      <h1>Hè lô, Welcome to My Excel Tool!</h1>
      <p>Chọn file và nhấn nút... Bùm 🎇</p>
      <ExcelToJsonConverter />
    </div>
  );
}

export default App;

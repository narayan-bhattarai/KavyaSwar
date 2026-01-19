import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateKavya from './pages/CreateKavya';
import ReadKavya from './pages/ReadKavya';
import './App.css';

// We use './index.css' primarily, App.css can be kept empty or removed if needed. 
// But Vite template imports it.

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateKavya />} />
        <Route path="/read/:id" element={<ReadKavya />} />
      </Routes>
    </Router>
  );
}

export default App;

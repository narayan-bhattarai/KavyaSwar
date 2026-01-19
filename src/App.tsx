import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateKavya from './pages/CreateKavya';
import ReadKavya from './pages/ReadKavya';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateKavya />} />
          <Route path="/read/:id" element={<ReadKavya />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

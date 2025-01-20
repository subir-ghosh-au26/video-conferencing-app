// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Room from './pages/Room';
import Call from './pages/Call';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Room />} />
        <Route path="/call/:id" element={<Call />} />
      </Routes>
    </Router>
  );
};

export default App;
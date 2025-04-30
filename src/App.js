import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import Login from "./components/login";
import Register from "./components/register";
import Trip from "./components/trip";
import Match from "./components/match";
import Locker from "./components/locker";
import TripDetail from './components/matchdetail';
import LineTrip from './components/LineTrip';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/trip" element={<Trip />} />
        <Route path="/match" element={<Match />} />
        <Route path="/locker" element={<Locker />} />
        <Route path="/trip-detail/:tripId" element={<TripDetail />} />
        <Route path="/linetrip" element={<LineTrip />} />
      </Routes>
    </Router>
  );
}

export default App;

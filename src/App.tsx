import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Schedule from "@/pages/Schedule";
import Checkin from "@/pages/Checkin";
import Exceptions from "@/pages/Exceptions";
import Leave from "@/pages/Leave";
import Approval from "@/pages/Approval";
import Summary from "@/pages/Summary";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/approval" element={<Approval />} />
          <Route path="/summary" element={<Summary />} />
        </Route>
      </Routes>
    </Router>
  );
}

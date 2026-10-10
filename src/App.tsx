import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { TrustProfilePage } from './pages/TrustProfilePage';
import { IssueAttestationPage } from './pages/IssueAttestationPage';
import { SubmitWorkPage } from './pages/SubmitWorkPage';
import { TrustGraphPage } from './pages/TrustGraphPage';
import { VerificationDetailPage } from './pages/VerificationDetailPage';
import { VerifyPage } from './pages/VerifyPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Main Home / Landing */}
          <Route path="/" element={<HomePage />} />

          {/* Page 1: Trust Profile */}
          <Route path="/profile/:address" element={<TrustProfilePage />} />
          <Route path="/passport/:address" element={<TrustProfilePage />} />

          {/* Page 2: Issue Attestation & Developer Work Submission */}
          <Route path="/issue" element={<IssueAttestationPage />} />
          <Route path="/submit" element={<SubmitWorkPage />} />

          {/* Page 3: Trust Graph */}
          <Route path="/graph/:address" element={<TrustGraphPage />} />

          {/* Page 4: Verification Detail */}
          <Route path="/verify/:id" element={<VerificationDetailPage />} />
          <Route path="/proof/:id" element={<VerificationDetailPage />} />

          {/* Verifier Dashboard Queue */}
          <Route path="/verify" element={<VerifyPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

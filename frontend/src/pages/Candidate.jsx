import React, { useState, useEffect } from 'react';
import { fetchJobs, previewMatch, applyToJob, extractErrorMessage } from '../api/service';

const Candidate = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await fetchJobs();
        setJobs(data);
        if (data.length > 0) {
          setSelectedJob(data[0]);
        }
      } catch (error) {
        setStatusMessage(extractErrorMessage(error));
        setIsError(true);
      }
    };
    loadJobs();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setStatusMessage('Please select a valid PDF file.');
        setIsError(true);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setStatusMessage(`Selected file: ${file.name}`);
      setIsError(false);
      setAnalysisResult(null); // Reset analysis when new file is chosen
    }
  };

  const handleAnalyze = async () => {
    if (!selectedJob) return;
    if (!selectedFile) {
      setStatusMessage('Please upload a resume PDF first.');
      setIsError(true);
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Running AI resume analysis...');
    setIsError(false);
    setAnalysisResult(null);

    try {
      const result = await previewMatch(selectedJob.id, selectedFile);
      setAnalysisResult(result);
      setStatusMessage('Analysis complete!');
    } catch (error) {
      setStatusMessage(extractErrorMessage(error));
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!selectedJob) return;
    if (!selectedFile) {
      setStatusMessage('Please upload your resume PDF to apply.');
      setIsError(true);
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Submitting application...');
    setIsError(false);

    try {
      await applyToJob(selectedJob.id, selectedFile);
      setStatusMessage('Application submitted successfully!');
    } catch (error) {
      setStatusMessage(extractErrorMessage(error));
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const getSkillsList = (skillsStr) => {
    if (!skillsStr) return [];
    return skillsStr.split(',').map(s => s.trim()).filter(Boolean);
  };

  return (
    <div className="candidate-dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>Resume <span>RMS</span></h1>
          <span className="badge">Candidate Portal</span>
        </div>
        <button onClick={handleLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="dashboard-layout">
        {/* Left Side Panel - Jobs List */}
        <aside className="jobs-panel">
          <h2 className="panel-title">Explore Jobs ({jobs.length})</h2>
          <div className="jobs-list">
            {jobs.length === 0 ? (
              <p className="no-jobs">No job openings available.</p>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className={`job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedJob(job);
                    setAnalysisResult(null);
                    setStatusMessage('');
                    setSelectedFile(null);
                  }}
                >
                  <h3>{job.title}</h3>
                  <p className="company-name">Client Partner</p>
                  <div className="skills-tags-preview">
                    {getSkillsList(job.required_skills).slice(0, 3).map((skill, index) => (
                      <span key={index} className="skill-tag-micro">{skill}</span>
                    ))}
                    {getSkillsList(job.required_skills).length > 3 && (
                      <span className="skill-tag-micro-more">+{getSkillsList(job.required_skills).length - 3}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Side Panel - Job Detail and AI Section */}
        <main className="detail-panel">
          {selectedJob ? (
            <div className="job-detail-content">
              <div className="job-info-card">
                <h2>{selectedJob.title}</h2>
                <div className="description-section">
                  <h4>Job Description</h4>
                  <p>{selectedJob.description}</p>
                </div>

                <div className="skills-section">
                  <h4>Required Skills</h4>
                  <div className="skills-tags">
                    {getSkillsList(selectedJob.required_skills).map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Resume Match Section */}
              <div className="ai-workspace">
                <div className="workspace-header">
                  <h3>AI Resume Optimization</h3>
                  <p>Check matching keywords and extract skill gaps before submitting your official application</p>
                </div>

                {/* Upload Zone */}
                <div className="upload-zone">
                  <label htmlFor="resume-upload" className="file-input-label">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    <span>{selectedFile ? 'Change Selected PDF' : 'Upload Resume PDF'}</span>
                  </label>
                  <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                  {selectedFile && <div className="file-name-indicator">{selectedFile.name}</div>}
                </div>

                {statusMessage && (
                  <div className={`status-banner ${isError ? 'banner-error' : 'banner-info'}`}>
                    {statusMessage}
                  </div>
                )}

                <div className="action-buttons">
                  <button
                    onClick={handleAnalyze}
                    disabled={isProcessing || !selectedFile}
                    className="btn btn-secondary"
                  >
                    {isProcessing ? 'Analyzing...' : 'Analyze Resume Fit'}
                  </button>

                  <button
                    onClick={handleApply}
                    disabled={isProcessing || !selectedFile}
                    className="btn btn-primary"
                  >
                    Officially Submit Application
                  </button>
                </div>

                {/* Analysis Results Display */}
                {analysisResult && (
                  <div className="analysis-results-card">
                    <div className="score-container">
                      <div className="score-badge">
                        <span className="percent">{analysisResult.match_score}%</span>
                        <span className="label">Match Score</span>
                      </div>
                      <div className="score-feedback">
                        {analysisResult.match_score >= 80 ? (
                          <p className="match-status match-high">High Match! Excellent alignment with job description.</p>
                        ) : analysisResult.match_score >= 50 ? (
                          <p className="match-status match-mid">Medium Match. Address the skill gaps below to increase alignment.</p>
                        ) : (
                          <p className="match-status match-low">Low Match. You may want to review required skills before applying.</p>
                        )}
                      </div>
                    </div>

                    <div className="gaps-container">
                      <h4>Suggested Skills to Add</h4>
                      {analysisResult.missing_skills.length === 0 ? (
                        <p className="no-gaps">🎉 No skill gaps detected! Your resume matches the job description parameters perfectly.</p>
                      ) : (
                        <div className="gaps-list">
                          {analysisResult.missing_skills.map((skill, index) => (
                            <span key={index} className="gap-tag">{skill}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="select-job-prompt">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <h3>No Job Selected</h3>
              <p>Please click a job posting from the explore panel to view requirements and run resume optimization.</p>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        .candidate-dashboard {
          min-height: 100vh;
          background: #09090b;
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 0;
        }

        .candidate-dashboard * {
          box-sizing: border-box;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(9, 9, 11, 0.8);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-brand h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .header-brand h1 span {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-brand .badge {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
        }

        .logout-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #d4d4d8;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: inherit;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .dashboard-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          flex: 1;
          height: calc(100vh - 73px);
          overflow: hidden;
        }

        /* Left side panel */
        .jobs-panel {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.01);
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow-y: auto;
        }

        .panel-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: #e4e4e7;
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .no-jobs {
          color: #71717a;
          text-align: center;
          font-size: 14px;
          margin-top: 40px;
        }

        .job-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .job-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .job-card.active {
          background: rgba(99, 102, 241, 0.08);
          border-color: #6366f1;
        }

        .job-card h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
        }

        .company-name {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #a1a1aa;
        }

        .skills-tags-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .skill-tag-micro {
          background: rgba(255, 255, 255, 0.04);
          color: #d4d4d8;
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .skill-tag-micro-more {
          color: #6366f1;
          font-size: 11px;
          padding: 2px 4px;
          font-weight: 600;
        }

        /* Right side panel */
        .detail-panel {
          padding: 32px 40px;
          overflow-y: auto;
          background: #09090b;
        }

        .select-job-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #71717a;
          text-align: center;
        }

        .select-job-prompt svg {
          margin-bottom: 16px;
          color: #27272a;
        }

        .select-job-prompt h3 {
          color: #e4e4e7;
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .select-job-prompt p {
          max-width: 400px;
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .job-info-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .job-info-card h2 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 20px 0;
          letter-spacing: -0.5px;
        }

        .description-section, .skills-section {
          margin-bottom: 24px;
        }

        .job-info-card h4 {
          font-size: 14px;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 10px 0;
          font-weight: 600;
        }

        .job-info-card p {
          color: #e4e4e7;
          font-size: 15px;
          line-height: 1.7;
          margin: 0;
        }

        .skills-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .skill-tag {
          background: rgba(99, 102, 241, 0.08);
          color: #c7d2fe;
          border: 1px solid rgba(99, 102, 241, 0.15);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        /* AI Workspace */
        .ai-workspace {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 30px;
          backdrop-filter: blur(16px);
        }

        .workspace-header {
          margin-bottom: 24px;
        }

        .workspace-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .workspace-header p {
          color: #a1a1aa;
          font-size: 14px;
          margin: 0;
          font-weight: 300;
        }

        .upload-zone {
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.01);
          margin-bottom: 20px;
          position: relative;
        }

        .upload-zone:hover {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.02);
        }

        .file-input-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #d4d4d8;
          font-weight: 500;
          font-size: 14px;
        }

        .file-input-label svg {
          color: #6366f1;
        }

        .file-input-hidden {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .file-name-indicator {
          margin-top: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 12px;
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.2);
        }

        .status-banner {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .banner-info {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #c7d2fe;
        }

        .banner-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 30px;
        }

        .btn {
          font-family: inherit;
          padding: 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          text-align: center;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        /* Analysis Card */
        .analysis-results-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .score-container {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .score-badge {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          padding: 16px;
          border-radius: 16px;
          min-width: 100px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        .score-badge .percent {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
        }

        .score-badge .label {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          margin-top: 2px;
          font-weight: 600;
        }

        .score-feedback {
          flex: 1;
        }

        .match-status {
          font-size: 14px;
          font-weight: 500;
          margin: 0;
          line-height: 1.5;
        }

        .match-high { color: #34d399; }
        .match-mid { color: #fbbf24; }
        .match-low { color: #f87171; }

        .gaps-container h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #d4d4d8;
        }

        .no-gaps {
          color: #34d399;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .gaps-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .gap-tag {
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.15);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
      `}} />
    </div>
  );
};

export default Candidate;

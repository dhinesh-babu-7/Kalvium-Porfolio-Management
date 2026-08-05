import React, { useState, useEffect } from "react";
import "./Students.css";
import { supabase } from "../lib/supabase.js";
import { useNavigate } from "react-router-dom";


export default function Students() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [studentsData, setStudentsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

    const [searchQuery, setSearchQuery] = useState("");

  const filteredStudents = studentsData.filter((student) => {
  const query = searchQuery.toLowerCase();

  return (
    student.name.toLowerCase().includes(query) ||
    student.role.toLowerCase().includes(query) ||
    (student.skills || []).some(skill =>
     skill.toLowerCase().includes(query)
    )
  );

});


  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage)); 
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  const itemsToRenderCount = isLoading ? itemsPerPage : currentStudents.length;


  useEffect(() => {

  const fetchStudents = async () => {

    setIsLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*");

      console.log("Profiles data:", data);
      console.log("Profiles error:", error);

    if(error){
      console.log("Error fetching students:", error);
      setIsLoading(false);
      return;
    }


const formattedStudents = data.map((student) => ({
  id: student.user_id,

  name: student.name || "Unknown",

  role: student.title || "Student",

  avatar: student.avatar_url || "/default-avatar.png",

  skills: [
    student.github ? "GitHub" : null,
    student.leetcode ? "LeetCode" : null,
    student.linkedin ? "LinkedIn" : null,
  ].filter(Boolean),
}));


    setStudentsData(formattedStudents);

    setIsLoading(false);

  };


  fetchStudents();

}, []);

  useEffect(()=>{
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null; 

    const pages = [];
    let showPages = [1, 2, 3];
    
    if (currentPage > 2) {
      showPages = [currentPage - 1, currentPage, currentPage + 1].filter(p => p < totalPages);
    }
    if (currentPage === totalPages && totalPages > 2) {
      showPages = [totalPages - 2, totalPages - 1].filter(p => p > 1);
    }

    if (showPages[0] > 1) {
      pages.push(<button key={1} className="page-btn" onClick={() => handlePageChange(1)}>1</button>);
      if (showPages[0] > 2) {
        pages.push(<span key="dots-start" className="page-dots">...</span>);
      }
    }


    showPages.forEach(page => {
      pages.push(
        <button 
          key={page} 
          className={`page-btn ${currentPage === page ? "active" : ""}`}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </button>
      );
    });

    if (showPages[showPages.length - 1] < totalPages - 1) {
      pages.push(<span key="dots-end" className="page-dots">...</span>);
    }
    
    if (showPages[showPages.length - 1] < totalPages) {
      pages.push(
        <button 
          key={totalPages} 
          className={`page-btn ${currentPage === totalPages ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (

    
    <div className="students-page-container">
      <title>Kalvium Portfolio | Students</title>
      {/* Header Section */}
      <div className="students-header">
        <div className="header-text">
          <h1>Students</h1>
          <p>Discover and connect with talented Kalvium students.</p>
          <p>Explore their skills, projects, and achievements.</p>
        </div>
        
        <div className="header-controls">
          <div className="search-bar-container">
            <input
              type="text"
              placeholder="Search students by name or skill..."
              className="search-bar"
              value={searchQuery}
              onChange={(e)=>setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="filters-row">
            <select><option>All Domains</option></select>
            <select><option>All Skills</option></select>
            <select><option>All Batches</option></select>
            <select><option>Sort by: A → Z</option></select>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        {isLoading ? (
          <span className="skeleton skeleton-inline-text"></span>
        ) : (
          <>
            {totalItems === 0 ? (
              "No students found"
            ) : (
              `Showing ${startIndex + 1}-${endIndex} of `
            )}
            {totalItems > 0 && <span className="highlight">{totalItems}</span>} {totalItems > 0 && "students"}
          </>
        )}
      </div>

      {/* Students Grid */}
      <div className="students-grid">
        {isLoading 
          ? /* Render Exact Number of Skeleton Cards Based on Current Page Data */
            Array.from({ length: itemsToRenderCount }).map((_, index) => (
              <div className="student-card skeleton-card" key={`skeleton-${index}`}>
                <div className="skeleton skeleton-badge"></div>
                <div className="skeleton skeleton-avatar"></div>
                <div className="skeleton skeleton-name"></div>
                <div className="skeleton skeleton-role"></div>
                <div className="student-skills">
                  <div className="skeleton skeleton-skill"></div>
                  <div className="skeleton skeleton-skill"></div>
                  <div className="skeleton skeleton-skill"></div>
                </div>
                <div className="skeleton skeleton-btn"></div>
              </div>
            ))
          : /* Render Actual Student Cards */
            currentStudents.map((student) => (
              <div className="student-card" key={student.id}>
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="student-avatar"
                />
                <h3 className="student-name">{student.name}</h3>
                <p className="student-role">{student.role}</p>
                
                <div className="student-skills">
                  {student.skills.map((skill, index) => (
                    <span className="skill-tag" key={index}>{skill}</span>
                  ))}
                </div>
                
                <button 
                  className="view-profile-btn"
                  onClick={() => navigate(`/student/${student.id}`)}
                >View Profile</button>
              </div>
            ))
        }
      </div>

      {/* Pagination Controls - Hides completely if 0 or 1 page */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            &lt;
          </button>
          
          {renderPaginationButtons()}
          
          <button 
            className="page-btn" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
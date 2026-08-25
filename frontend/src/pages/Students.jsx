import React, { useState, useEffect, useRef } from "react";
import "./Students.css";
import { getAllStudents } from "../api/routes/Public/StudentInfo";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 12;

function LazyAvatar({ src, alt }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);
  const imgRef = useRef(null);

  useEffect(() => {
    setImgSrc(src);
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true);
    }
  }, [imgSrc]);

  return (
    <div className="avatar-wrapper">
      {!isLoaded && (
        <div className="skeleton skeleton-avatar-placeholder" />
      )}

      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`student-avatar ${isLoaded ? "loaded" : "loading"}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (imgSrc !== "/default-avatar.png") {
            setImgSrc("/default-avatar.png");
          } else {
            setIsLoaded(true);
          }
        }}
      />
    </div>
  );
}

export default function Students() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [studentsData, setStudentsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSquad, setSelectedSquad] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");

  const availableSquads = Array.from(
    new Set(studentsData.map((student) => student.squad_id).filter(Boolean))
  ).sort((firstSquad, secondSquad) => Number(firstSquad) - Number(secondSquad));

  const filteredStudents = studentsData.filter((student) => {
    const query = searchQuery.toLowerCase();
    const matchesSquad =
      selectedSquad === "all" || String(student.squad_id) === selectedSquad;

    return (
      matchesSquad &&
      (student.name.toLowerCase().includes(query) ||
        student.role.toLowerCase().includes(query) ||
        (student.skills || []).some((skill) =>
          skill.toLowerCase().includes(query)
        ))
    );
  });

  const sortedStudents = [...filteredStudents].sort((firstStudent, secondStudent) => {
    const nameComparison = firstStudent.name.localeCompare(
      secondStudent.name,
      undefined,
      { sensitivity: "base" }
    );

    return sortOrder === "asc" ? nameComparison : -nameComparison;
  });

  const totalItems = sortedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentStudents = sortedStudents.slice(startIndex, endIndex);

  const itemsToRenderCount = isLoading ? ITEMS_PER_PAGE : currentStudents.length;

  // Fetch students
  useEffect(() => {
    let isMounted = true;

    const fetchStudents = async () => {
      setIsLoading(true);

      try {
        const data = await getAllStudents();

        if (!isMounted) return;

        // Protect against API returning a non-array
        const students = Array.isArray(data) ? data : [];

        const formattedStudents = students.map((student) => ({
          user_id: student.user_id,
          squad_id: String(student.squad_id ?? student.squadId ?? ""),
          name: student.name || "Unknown",
          role: student.title || student.role || "Student",

          avatar:
            student.avatar_url && student.avatar_url.trim() !== ""
              ? student.avatar_url
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  student.name || "Student"
                )}&background=0D8ABC&color=fff&size=256`,

          skills: [
            student.github ? "GitHub" : null,
            student.leetcode ? "LeetCode" : null,
            student.linkedin ? "LinkedIn" : null,
          ].filter(Boolean),
        }));

        setStudentsData(formattedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);

        if (isMounted) {
          setStudentsData([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSquad, sortOrder]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    let showPages = [1, 2, 3];

    if (currentPage > 2) {
      showPages = [currentPage - 1, currentPage, currentPage + 1].filter(
        (p) => p < totalPages
      );
    }

    if (currentPage === totalPages && totalPages > 2) {
      showPages = [totalPages - 2, totalPages - 1].filter((p) => p > 1);
    }

    if (showPages[0] > 1) {
      pages.push(
        <button
          key={1}
          className={`page-btn ${currentPage === 1 ? "active" : ""}`}
          onClick={() => handlePageChange(1)}
          aria-label="Go to page 1"
        >
          1
        </button>
      );

      if (showPages[0] > 2) {
        pages.push(
          <span key="dots-start" className="page-dots">
            ...
          </span>
        );
      }
    }

    showPages.forEach((page) => {
      pages.push(
        <button
          key={page}
          className={`page-btn ${currentPage === page ? "active" : ""}`}
          onClick={() => handlePageChange(page)}
          aria-label={`Go to page ${page}`}
        >
          {page}
        </button>
      );
    });

    if (showPages[showPages.length - 1] < totalPages - 1) {
      pages.push(
        <span key="dots-end" className="page-dots">
          ...
        </span>
      );
    }

    if (showPages[showPages.length - 1] < totalPages) {
      pages.push(
        <button
          key={totalPages}
          className={`page-btn ${currentPage === totalPages ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
          aria-label={`Go to page ${totalPages}`}
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filters-row">
            <select
              value={selectedSquad}
              onChange={(event) => setSelectedSquad(event.target.value)}
              aria-label="Filter students by squad ID"
            >
              <option value="all">All Squads</option>
              {availableSquads.map((squadId) => (
                <option key={squadId} value={String(squadId)}>
                  Squad {squadId}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="Sort students by name"
            >
              <option value="asc">Sort by: A → Z</option>
              <option value="desc">Sort by: Z → A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        {isLoading ? (
          <span className="skeleton skeleton-inline-text" />
        ) : totalItems === 0 ? (
          "No students found"
        ) : (
          <>
            Showing {startIndex + 1}-{endIndex} of{" "}
            <span className="highlight">{totalItems}</span> students
          </>
        )}
      </div>

      {/* Students Grid */}
      <div className="students-grid">
        {isLoading
          ? Array.from({
              length: itemsToRenderCount,
            }).map((_, index) => (
              <div
                className="student-card skeleton-card"
                key={`skeleton-${index}`}
              >
                <div className="skeleton skeleton-badge" />
                <div className="skeleton skeleton-avatar" />
                <div className="skeleton skeleton-name" />
                <div className="skeleton skeleton-role" />

                <div className="student-skills">
                  <div className="skeleton skeleton-skill" />
                  <div className="skeleton skeleton-skill" />
                  <div className="skeleton skeleton-skill" />
                </div>

                <div className="skeleton skeleton-btn" />
              </div>
            ))
          : currentStudents.map((student) => (
              <div className="student-card" key={student.user_id}>
                <LazyAvatar src={student.avatar} alt={student.name} />

                <h3 className="student-name">{student.name}</h3>

                <p className="student-role">{student.role}</p>

                <div className="student-skills">
                  {student.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>

                <button
                  className="view-profile-btn"
                  onClick={() => navigate(`/portfolio/${student.user_id}`)}
                >
                  View Profile
                </button>
              </div>
            ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn nav-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous Page"
          >
            &lt;
          </button>

          {renderPaginationButtons()}

          <button
            className="page-btn nav-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next Page"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLayout } from "@/components/LayoutController";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  Download,
  Eye,
  TrendingUp,
  Award,
  Flag,
  ChevronRight,
  ChevronLeft,
  Loader2,
  X,
  Play,
  Pause,
} from "lucide-react";
import CatQuestions from "@/components/CatQuestions";
import Disclaimer from "@/components/Disclaimer";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export default function CatsPage() {
  const { sidebarCollapsed, isMobileView, isTabletView } = useLayout();
  const [cats, setCats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [isTakingCat, setIsTakingCat] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const hasFetched = useRef(false);
  const [openEndedAnswers, setOpenEndedAnswers] = useState<string[]>([]);
  const [openEndedImages, setOpenEndedImages] = useState<(File | null)[]>([]);
  const [questionsType, setQuestionsType] = useState<string>("");
  const [closeEndedType, setCloseEndedType] = useState<string>("");
  const [multipleAnswers, setMultipleAnswers] = useState<number[][]>([]);
  const [openEndedInputModes, setOpenEndedInputModes] = useState<
    ("text" | "image" | null)[]
  >([]);
  const [isNextLoading, setIsNextLoading] = useState(false);

  // Fetch CATs from unified API
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchCats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/bd/student/assessments`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch assessments");
        const data = await res.json();
        
        // Filter only CATs
        const catsOnly = (Array.isArray(data) ? data : []).filter((assessment: any) => assessment.type === "CAT");
        setCats(catsOnly);
      } catch (err: any) {
        setError(err.message || "Failed to load CATs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCats();
  }, []);

  // Timer for CATs with duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTakingCat && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitCat();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTakingCat, timeLeft]);

  const hasContent = cats.length > 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "start":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "in-progress":
        return "text-amber-600 bg-amber-50 border-amber-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} />;
      case "start":
        return <Play size={16} />;
      case "in-progress":
        return <Pause size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "start":
        return "Start";
      case "in-progress":
        return "In Progress";
      default:
        return "Unknown";
    }
  };

  const filteredCats = cats.filter((cat) => {
    if (selectedFilter === "all") return true;
    return cat.status === selectedFilter;
  });

  const averageScore =
    cats
      .filter((cat) => cat.score !== null && cat.score !== undefined)
      .reduce((acc, cat) => acc + (cat.score || 0), 0) /
    (cats.filter((cat) => cat.score !== null && cat.score !== undefined)
      .length || 1);

  const handleStartCat = async (catId: string) => {
    const cat = cats.find((c) => c.id === catId);
    if (!cat) return;

    setActiveCat(catId);
    setShowDisclaimer(true);
  };

  const proceedToCat = () => {
    const cat = cats.find((c) => c.id === activeCat);
    if (!cat) return;

    setShowDisclaimer(false);
    setIsTakingCat(true);
    setCurrentQuestion(0);

    try {
      // Use the questions from the assessment data
      const questions = cat.questions || [];
      setQuestions(questions);
      setQuestionsType(cat.questions_type);
      setCloseEndedType(cat.close_ended_type || "");

      if (cat.questions_type === "open-ended") {
        setOpenEndedAnswers(Array(questions.length).fill(""));
        setOpenEndedImages(Array(questions.length).fill(null));
        setOpenEndedInputModes(Array(questions.length).fill(null));
        setSelectedAnswers([]);
        setMultipleAnswers([]);
      } else {
        if (cat.close_ended_type === "multiple choice with multiple answers") {
          setMultipleAnswers(Array(questions.length).fill([]));
          setSelectedAnswers([]);
        } else {
          setSelectedAnswers(Array(questions.length).fill(-1));
          setMultipleAnswers([]);
        }
        setOpenEndedAnswers([]);
        setOpenEndedImages([]);
      }
      setFlaggedQuestions([]);
      setTimeLeft((cat.duration || 60) * 60);
    } catch (err) {
      setQuestions([]);
      setQuestionsType("");
      setCloseEndedType("");
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    if (closeEndedType === "multiple choice with multiple answers") {
      const newAnswers = [...multipleAnswers];
      if (!newAnswers[questionIndex]) {
        newAnswers[questionIndex] = [];
      }
      if (newAnswers[questionIndex].includes(optionIndex)) {
        newAnswers[questionIndex] = newAnswers[questionIndex].filter(
          (idx) => idx !== optionIndex
        );
      } else {
        newAnswers[questionIndex] = [...newAnswers[questionIndex], optionIndex];
      }
      setMultipleAnswers(newAnswers);
    } else {
      const newAnswers = [...selectedAnswers];
      newAnswers[questionIndex] = optionIndex;
      setSelectedAnswers(newAnswers);
    }
  };

  const toggleFlagQuestion = (index: number) => {
    if (flaggedQuestions.includes(index)) {
      setFlaggedQuestions(flaggedQuestions.filter((q) => q !== index));
    } else {
      setFlaggedQuestions([...flaggedQuestions, index]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSubmitCat = async () => {
    setIsSubmitting(true);
    try {
      // Send final submission request
      if (activeCat) {
        await fetch(`${apiBaseUrl}/bd/student/assessments/${activeCat}/submit`, {
          method: "GET",
          credentials: "include",
        });
      }
      // Simulate submission delay
      setTimeout(() => {
        setIsTakingCat(false);
        setIsSubmitting(false);
        setShowConfirmSubmit(false);
        // In a real app, you would send the answers to the server
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      // Optionally handle error
    }
  };

  const currentCat = cats.find((cat) => cat.id === activeCat);

  const getAnsweredCount = () => {
    if (questionsType === "close-ended") {
      if (closeEndedType === "multiple choice with multiple answers") {
        return multipleAnswers.filter((a) => a && a.length > 0).length;
      } else {
        return selectedAnswers.filter((a) => a !== -1).length;
      }
    } else if (questionsType === "open-ended") {
      return questions.reduce((count, _, index) => {
        const textAnswer = openEndedAnswers[index]?.trim();
        const imageAnswer = openEndedImages[index];
        if (textAnswer || imageAnswer) {
          return count + 1;
        }
        return count;
      }, 0);
    }
    return 0;
  };

  const isCurrentQuestionAnswered = () => {
    if (questions.length === 0) return false;

    if (questionsType === "open-ended") {
      const textAnswer = openEndedAnswers[currentQuestion]?.trim();
      const imageAnswer = openEndedImages[currentQuestion];
      return !!textAnswer || !!imageAnswer;
    } else {
      // 'close-ended'
      if (closeEndedType === "multiple choice with multiple answers") {
        return (
          multipleAnswers[currentQuestion] &&
          multipleAnswers[currentQuestion].length > 0
        );
      } else {
        return selectedAnswers[currentQuestion] !== -1;
      }
    }
  };

  // Question rendering component
  const renderQuestion = (question: any, index: number) => {
    if (questionsType === "open-ended") {
      const handleInputModeChange = (mode: "text" | "image") => {
        const newModes = [...openEndedInputModes];
        newModes[index] = mode;
        setOpenEndedInputModes(newModes);
      };

      const inputMode = openEndedInputModes[index];

      if (!inputMode) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Question {index + 1}: {question.text}
            </h3>
            <p className="text-gray-600">
              Please choose how you would like to answer this question. This
              choice cannot be changed.
            </p>
            <div className="flex space-x-4 pt-2">
              <button
                onClick={() => handleInputModeChange("text")}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Answer with Text
              </button>
              <button
                onClick={() => handleInputModeChange("image")}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                Upload an Image
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Question {index + 1}: {question.text}
          </h3>
          {inputMode === "text" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <textarea
                rows={6}
                value={openEndedAnswers[index] || ""}
                onChange={(e) => {
                  const newAnswers = [...openEndedAnswers];
                  newAnswers[index] = e.target.value;
                  setOpenEndedAnswers(newAnswers);
                }}
                placeholder="Type your answer here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
          {inputMode === "image" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const newImages = [...openEndedImages];
                  newImages[index] = e.target.files?.[0] || null;
                  setOpenEndedImages(newImages);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      );
    } else {
      // Close-ended questions
      const choices = question.choices || [];
      return (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            Question {index + 1}: {question.text}
          </h3>
          <div className="space-y-2">
            {choices.map((choice: string, choiceIndex: number) => (
              <label
                key={choiceIndex}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type={
                    closeEndedType === "multiple choice with multiple answers"
                      ? "checkbox"
                      : "radio"
                  }
                  name={
                    closeEndedType === "multiple choice with multiple answers"
                      ? undefined
                      : `question-${index}`
                  }
                  checked={
                    closeEndedType === "multiple choice with multiple answers"
                      ? multipleAnswers[index]?.includes(choiceIndex) || false
                      : selectedAnswers[index] === choiceIndex
                  }
                  onChange={() => handleAnswerSelect(index, choiceIndex)}
                  className="mr-3"
                />
                <span className="text-gray-700">{choice}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
  };

  // Submit answer for the current question
  const submitCurrentAnswer = async (questionIndex: number) => {
    const question = questions[questionIndex];
    if (!question) return;
    const formData = new FormData();
    let answerType = "text";
    let textAnswer = "";
    let imageFile = null;

    if (questionsType === "close-ended") {
      if (closeEndedType === "multiple choice with multiple answers") {
        // Multiple answers as comma-separated string
        textAnswer = (multipleAnswers[questionIndex] || [])
          .map((idx) => question.choices?.[idx] || "")
          .filter(Boolean)
          .join(",");
      } else {
        // Single answer
        textAnswer = question.choices?.[selectedAnswers[questionIndex]] || "";
      }
      formData.append("answer_type", "text");
      formData.append("text_answer", textAnswer);
    } else if (questionsType === "open-ended") {
      const inputMode = openEndedInputModes[questionIndex];
      if (inputMode === "text") {
        answerType = "text";
        textAnswer = openEndedAnswers[questionIndex] || "";
        formData.append("answer_type", "text");
        formData.append("text_answer", textAnswer);
      } else if (inputMode === "image") {
        answerType = "image";
        imageFile = openEndedImages[questionIndex];
        if (imageFile) {
          formData.append("answer_type", "image");
          formData.append("image", imageFile);
        }
      }
    }

    try {
      await fetch(`${apiBaseUrl}/bd/student/questions/${question.id}/answer`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
    } catch (err) {
      // Optionally handle error (e.g., show notification)
      console.error("Failed to submit answer", err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <motion.div
        initial={{
          marginLeft:
            !isMobileView && !isTabletView ? (sidebarCollapsed ? 80 : 240) : 0,
        }}
        animate={{
          marginLeft:
            !isMobileView && !isTabletView ? (sidebarCollapsed ? 80 : 240) : 0,
        }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-auto"
      >
        <Header title="My CATs" showWeekSelector={hasContent} />

        <main className="p-4 md:p-6">
          {showDisclaimer && currentCat && (
            <Disclaimer
              title={currentCat.title}
              numberOfQuestions={currentCat.number_of_questions}
              duration={currentCat.duration}
              onAgree={proceedToCat}
              onCancel={() => {
                setShowDisclaimer(false);
                setActiveCat(null);
              }}
            />
          )}
          {!hasContent ? (
            <div className="max-w-4xl mx-auto">
              <EmptyState
                title="No CATs Available"
                description="Your Continuous Assessment Tests will appear here once your lecturers create them. Check back regularly for updates."
                icon={<BookOpen size={48} />}
              />
            </div>
          ) : isTakingCat && questions.length > 0 ? (
            <div className="max-w-5xl mx-auto">
              {/* Taking CAT UI */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {currentCat?.title}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {currentCat?.topic}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div
                        className={`px-4 py-2 rounded-lg text-white font-medium ${
                          timeLeft < 300 ? "bg-red-500" : "bg-blue-600"
                        }`}
                      >
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2" />
                          <span>{formatTime(timeLeft)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {questions.length > 0 && (
                    <div>
                      {renderQuestion(questions[currentQuestion], currentQuestion)}
                      
                      <div className="flex justify-between items-center mt-6">
                        <div className="text-sm text-gray-600">
                          Question {currentQuestion + 1} of {questions.length}
                        </div>
                        {currentQuestion < questions.length - 1 ? (
                          <button
                            onClick={async () => {
                              setIsNextLoading(true);
                              await submitCurrentAnswer(currentQuestion);
                              setCurrentQuestion(currentQuestion + 1);
                              setIsNextLoading(false);
                            }}
                            disabled={
                              isNextLoading || questions[currentQuestion]?.status !== "answered" && !isCurrentQuestionAnswered()
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                          >
                            {isNextLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                            {questions[currentQuestion]?.status === "answered" ? "Answered, Next" : "Next"}
                            <ChevronRight size={16} className="ml-1" />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              setIsNextLoading(true);
                              await submitCurrentAnswer(currentQuestion);
                              if (activeCat) {
                                await fetch(`${apiBaseUrl}/bd/student/assessments/${activeCat}/submit`, {
                                  method: "GET",
                                  credentials: "include",
                                });
                              }
                              setIsNextLoading(false);
                              setIsTakingCat(false); // End the CAT UI
                            }}
                            disabled={isNextLoading || questions[currentQuestion]?.status !== "answered" && !isCurrentQuestionAnswered()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                          >
                            {isNextLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                            {questions[currentQuestion]?.status === "answered" ? "Answered, Finish & Submit" : "Finish & Submit"}
                            <ChevronRight size={16} className="ml-1" />
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full bg-blue-600"
                            style={{
                              width: `${(getAnsweredCount() / questions.length) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getAnsweredCount()} of {questions.length} answered
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-8xl mx-auto">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: isLoading ? 0 : 1,
                    y: isLoading ? 20 : 0,
                  }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                >
                  {isLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total CATs
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {cats.length}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <BookOpen size={24} className="text-blue-600" />
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: isLoading ? 0 : 1,
                    y: isLoading ? 20 : 0,
                  }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                >
                  {isLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Completed
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {
                            cats.filter((cat) => cat.status === "completed")
                              .length
                          }
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                        <CheckCircle size={24} className="text-green-600" />
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: isLoading ? 0 : 1,
                    y: isLoading ? 20 : 0,
                  }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                >
                  {isLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Average Score
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {averageScore ? averageScore.toFixed(1) : "0"}%
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <TrendingUp size={24} className="text-blue-600" />
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: isLoading ? 0 : 1,
                    y: isLoading ? 20 : 0,
                  }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                >
                  {isLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Pending
                        </p>
                        <p className="text-2xl font-bold text-amber-600">
                          {
                            cats.filter((cat) => cat.status === "start")
                              .length
                          }
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Clock size={24} className="text-amber-600" />
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Filter Tabs */}
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                  {["all", "start", "in-progress", "completed"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedFilter === filter
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* CATs List */}
              <div className="space-y-4">
                {isLoading
                  ? // Skeleton loading for CATs
                    Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse"
                      >
                        <div className="flex justify-between">
                          <div className="space-y-3 w-full">
                            <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="flex items-center space-x-4">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                              <div className="h-4 bg-gray-200 rounded w-20"></div>
                            </div>
                            <div className="h-24 bg-gray-100 rounded w-full"></div>
                          </div>
                          <div className="h-16 w-16 bg-gray-300 rounded-full ml-4"></div>
                        </div>
                      </div>
                    ))
                  : filteredCats.map((cat, index) => (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 mr-3">
                                {cat.title}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                  cat.status
                                )}`}
                              >
                                {getStatusIcon(cat.status)}
                                <span className="ml-1">
                                  {getStatusText(cat.status)}
                                </span>
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 mb-3">
                              {cat.topic} • {cat.questions_type} • {cat.number_of_questions} questions
                            </p>

                            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                              <div className="flex items-center">
                                <Calendar size={16} className="mr-1" />
                                <span>
                                  Due:{" "}
                                  {cat.deadline ? new Date(cat.deadline).toLocaleDateString() : "No deadline"}
                                </span>
                              </div>

                              {cat.duration && (
                                <div className="flex items-center">
                                  <Clock size={16} className="mr-1" />
                                  <span>Duration: {cat.duration} mins</span>
                                </div>
                              )}

                              <div className="flex items-center">
                                <Award size={16} className="mr-1" />
                                <span>
                                  Total Marks: {cat.total_marks}
                                </span>
                              </div>
                            </div>

                            {cat.status === "start" && (
                              <button
                                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                onClick={() => handleStartCat(cat.id)}
                              >
                                Start CAT
                              </button>
                            )}
                            {cat.status === "in-progress" && (
                              <button
                                className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                                onClick={() => handleStartCat(cat.id)}
                              >
                                Continue CAT
                              </button>
                            )}
                            {cat.status === "completed" && (
                              <div className="mt-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                                <CheckCircle size={16} className="inline mr-2" />
                                Completed
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                {!isLoading && filteredCats.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {selectedFilter !== "all" ? selectedFilter : ""} CATs
                      found
                    </h3>
                    <p className="text-gray-600">
                      Check back later or select a different filter.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </motion.div>
    </div>
  );
}

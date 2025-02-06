"use client";
import React from "react";

import { useHandleStreamResponse } from "../utilities/runtime-helpers";

function MainComponent() {
  const [activeTab, setActiveTab] = useState("calculate");
  const [question, setQuestion] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [examQuestions, setExamQuestions] = useState([]);
  const [error, setError] = useState("");
  const [expandedStep, setExpandedStep] = useState(null);
  const [calculationSteps, setCalculationSteps] = useState([]);
  const [formData, setFormData] = useState({
    unitWeight: "",
    damHeight: "",
    waterLevel: "",
    crestWidth: "",
    upstreamSlope: "",
    downstreamSlope: "",
  });
  const handleReset = () => {
    setFormData({
      unitWeight: "",
      damHeight: "",
      waterLevel: "",
      crestWidth: "",
      upstreamSlope: "",
      downstreamSlope: "",
    });
    setQuestion("");
    setMessages([]);
    setError("");
    setLoading(false);
    setExpandedStep(null);
    setCalculationSteps([]);
  };
  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: async (message) => {
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
      setStreamingMessage("");
      setLoading(false);

      if (question) {
        await fetch("/api/db/calculations-5357286", {
          method: "POST",
          body: JSON.stringify({
            query:
              "INSERT INTO `calculations` (`question`, `answer`, `created_at`) VALUES (?, ?, ?)",
            values: [question, message, new Date().toISOString()],
          }),
        });
      }
    },
  });
  const fetchExamQuestions = async () => {
    setLoading(true);
    const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "Generate 10 unique and challenging multiple choice questions about gravity dam engineering and calculations. Include questions about structural analysis, hydraulic design, and safety considerations. Each question should have 4 options with only one correct answer.",
          },
        ],
        json_schema: {
          name: "exam_questions",
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                    },
                    correctAnswer: { type: "number" },
                    explanation: { type: "string" },
                  },
                  required: [
                    "question",
                    "options",
                    "correctAnswer",
                    "explanation",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      }),
    });
    const data = await response.json();
    const parsedQuestions = JSON.parse(
      data.choices[0].message.content
    ).questions;
    setExamQuestions(parsedQuestions);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "learn") {
      fetchExamQuestions();
    }
  }, [activeTab]);

  const handleAnswerSubmit = (answerIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion]: answerIndex,
    }));
  };
  const handleNextQuestion = () => {
    if (currentQuestion < examQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };
  const handleSubmit = async () => {
    if (Object.values(formData).some((value) => !value)) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    const response = await fetch("/integrations/anthropic-claude-sonnet-3-5/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an expert dam engineering calculator. For each calculation step, provide the formula, numerical substitution, and result in a clear format. Break down complex calculations into smaller steps.",
          },
          {
            role: "user",
            content: `Calculate the stability of a gravity dam with these parameters:
            - Unit Weight: ${formData.unitWeight} kg/m³
            - Dam Height: ${formData.damHeight} m
            - Water Level: ${formData.waterLevel} m
            - Crest Width: ${formData.crestWidth} m
            - Upstream Slope: ${formData.upstreamSlope}
            - Downstream Slope: ${formData.downstreamSlope}
            ${question ? `\nAdditional specifications: ${question}` : ""}
            
            Provide step-by-step calculations for:
            1. Dam self-weight and center of gravity
            2. Hydrostatic pressure forces
            3. Uplift pressure
            4. Stability analysis
            5. Safety factors (sliding and overturning)
            6. Design recommendations based on results
            
            For each step show:
            - Formula used
            - Numerical substitution
            - Final result with units`,
          },
        ],
      }),
    });

    const data = await response.json();
    const result = data.choices[0].message.content;

    setMessages((prev) => [...prev, { role: "assistant", content: result }]);
    setLoading(false);

    // Save calculation to database
    await fetch("/api/db/calculations-5357286", {
      method: "POST",
      body: JSON.stringify({
        query:
          "INSERT INTO `calculations` (`question`, `answer`, `created_at`) VALUES (?, ?, ?)",
        values: [
          question || "Standard calculation",
          result,
          new Date().toISOString(),
        ],
      }),
    });
  };

  return (
    <div className="min-h-screen bg-[#004aad]">
      <main className="container mx-auto p-4">
        {activeTab === "home" ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
            <img
              src="https://ucarecdn.com/cf164cb4-c477-4eec-8fe7-9cf3074ff5ab/-/format/auto/"
              alt="GravIT Dam Logo"
              className="w-48 h-48 mb-4"
            />
            <p className="text-xl md:text-2xl font-montserrat text-white text-center max-w-2xl">
              Your comprehensive platform for gravity dam engineering
              calculations and learning
            </p>
            <div className="flex flex-col md:flex-row gap-6">
              <button
                onClick={() => setActiveTab("learn")}
                className="bg-[#004aad] text-white px-8 py-6 rounded-2xl font-montserrat hover:bg-[#003a8d] text-xl flex items-center gap-3 shadow-lg border-b-4 border-[#003a8d] hover:border-[#002a6d] transition-all"
              >
                <i className="fas fa-book-open text-2xl"></i>
                Learn
              </button>
              <button
                onClick={() => setActiveTab("calculate")}
                className="bg-[#004aad] text-white px-8 py-6 rounded-2xl font-montserrat hover:bg-[#003a8d] text-xl flex items-center gap-3 shadow-lg border-b-4 border-[#003a8d] hover:border-[#002a6d] transition-all"
              >
                <i className="fas fa-calculator text-2xl"></i>
                Calculate
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setActiveTab("home")}
              className="mb-4 bg-white text-[#004aad] px-6 py-3 rounded-2xl font-montserrat hover:bg-[#f0f0f0] flex items-center gap-2 border-2 border-white transition-all"
            >
              <i className="fas fa-home text-xl"></i>
              Home
            </button>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#004aad]">
              <h2 className="font-roboto text-3xl text-[#004aad] mb-4">
                Master Gravity Dam Calculations, Anytime, Anywhere!
              </h2>
              {activeTab === "calculate" ? (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={handleReset}
                        className="bg-[#004aad] text-white px-4 py-2 rounded-lg font-montserrat hover:bg-[#003380] flex items-center gap-2"
                      >
                        <i className="fas fa-sync-alt"></i>
                        New Calculation
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Unit Weight (kg/m³)"
                        className="p-3 border rounded-lg font-montserrat"
                        name="unitWeight"
                        value={formData.unitWeight}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            unitWeight: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="number"
                        placeholder="Dam Height (m)"
                        className="p-3 border rounded-lg font-montserrat"
                        name="damHeight"
                        value={formData.damHeight}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            damHeight: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="number"
                        placeholder="Water Level (m)"
                        className="p-3 border rounded-lg font-montserrat"
                        name="waterLevel"
                        value={formData.waterLevel}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            waterLevel: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="number"
                        placeholder="Crest Width (m)"
                        className="p-3 border rounded-lg font-montserrat"
                        name="crestWidth"
                        value={formData.crestWidth}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            crestWidth: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Upstream Slope (1/2H:1V)"
                        className="p-3 border rounded-lg font-montserrat"
                        name="upstreamSlope"
                        value={formData.upstreamSlope}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            upstreamSlope: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Downstream Slope (1.5H:1V)"
                        className="p-3 border rounded-lg font-montserrat"
                        name="downstreamSlope"
                        value={formData.downstreamSlope}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            downstreamSlope: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Additional specifications or questions..."
                      className="w-full p-3 border rounded-lg font-montserrat"
                      rows={4}
                    />
                    {error && (
                      <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm font-montserrat">
                        {error}
                      </div>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={
                        loading ||
                        Object.values(formData).some((value) => !value)
                      }
                      className="bg-[#004aad] text-white px-4 py-2 rounded-lg font-montserrat hover:bg-[#003380] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Calculating..." : "Calculate"}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {messages.map(
                      (msg, idx) =>
                        msg.role === "assistant" && (
                          <div key={idx} className="space-y-4">
                            {msg.content
                              .split("\n\n")
                              .map((section, sectionIdx) => {
                                if (section.trim()) {
                                  const steps = section.split("\n");
                                  const stepTitle = steps[0];
                                  const stepContent = steps.slice(1).join("\n");

                                  return (
                                    <div
                                      key={sectionIdx}
                                      className="border-2 border-[#004aad] rounded-xl overflow-hidden"
                                    >
                                      <button
                                        onClick={() =>
                                          setExpandedStep(
                                            expandedStep === sectionIdx
                                              ? null
                                              : sectionIdx
                                          )
                                        }
                                        className="w-full p-4 bg-[#f8f9fa] hover:bg-[#e9ecef] flex items-center justify-between text-left transition-colors"
                                      >
                                        <div className="flex items-center">
                                          <div className="flex items-center justify-center bg-[#004aad] text-white rounded-full w-8 h-8 mr-3">
                                            {sectionIdx + 1}
                                          </div>
                                          <h4 className="font-montserrat text-lg text-[#004aad]">
                                            {stepTitle}
                                          </h4>
                                        </div>
                                        <i
                                          className={`fas fa-chevron-${
                                            expandedStep === sectionIdx
                                              ? "up"
                                              : "down"
                                          } text-[#004aad]`}
                                        ></i>
                                      </button>
                                      {expandedStep === sectionIdx && (
                                        <div className="p-4 bg-white border-t-2 border-[#004aad]">
                                          <div className="space-y-3">
                                            {stepContent
                                              .split("- ")
                                              .map((detail, detailIdx) => {
                                                if (detail.trim()) {
                                                  return (
                                                    <div
                                                      key={detailIdx}
                                                      className="font-montserrat"
                                                    >
                                                      <div className="flex items-start">
                                                        <div className="w-4 h-4 mt-1 mr-2 rounded-full bg-[#004aad] flex-shrink-0"></div>
                                                        <div className="text-base leading-relaxed whitespace-pre-wrap">
                                                          {detail.trim()}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                                return null;
                                              })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                          </div>
                        )
                    )}
                    {streamingMessage && (
                      <div className="p-4 rounded-lg bg-[#e8f0fe] animate-pulse">
                        <p className="font-montserrat whitespace-pre-wrap">
                          {streamingMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => {
                        setCurrentQuestion(0);
                        setUserAnswers({});
                        setShowResults(false);
                        fetchExamQuestions();
                      }}
                      className="bg-[#004aad] text-white p-6 rounded-2xl font-nunito hover:bg-[#003a8d] text-center shadow-lg border-b-4 border-[#003a8d] hover:border-[#002a6d] transition-all"
                    >
                      <i className="fas fa-book-open text-4xl mb-2"></i>
                      <h3 className="text-xl">Start Learning</h3>
                    </button>
                  </div>
                  {examQuestions.length > 0 && !showResults ? (
                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#004aad]">
                      <div className="mb-4">
                        <h3 className="font-nunito text-xl font-bold text-[#004aad]">
                          Question {currentQuestion + 1} of{" "}
                          {examQuestions.length}
                        </h3>
                        <p className="font-nunito mt-2 text-[#4B4B4B]">
                          {examQuestions[currentQuestion].question}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {examQuestions[currentQuestion].options.map(
                          (option, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAnswerSubmit(idx)}
                              className={`w-full p-4 text-left rounded-xl font-nunito transition-all ${
                                userAnswers[currentQuestion] === idx
                                  ? "bg-[#004aad] text-white border-b-4 border-[#003a8d]"
                                  : "bg-[#F5F8FF] hover:bg-[#E5EDFF] border-2 border-[#E5E5E5] hover:border-[#004aad]"
                              }`}
                            >
                              {option}
                            </button>
                          )
                        )}
                      </div>
                      <button
                        onClick={handleNextQuestion}
                        disabled={userAnswers[currentQuestion] === undefined}
                        className="mt-4 bg-[#004aad] text-white px-8 py-3 rounded-2xl font-nunito hover:bg-[#003a8d] disabled:opacity-50 shadow-lg border-b-4 border-[#003a8d] hover:border-[#002a6d] transition-all"
                      >
                        {currentQuestion === examQuestions.length - 1
                          ? "Check Results!"
                          : "Continue"}
                      </button>
                    </div>
                  ) : showResults ? (
                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#004aad]">
                      <h3 className="font-nunito text-2xl font-bold mb-4 text-[#004aad]">
                        Results
                      </h3>
                      <div className="mb-6">
                        <p className="font-nunito text-xl text-[#4B4B4B]">
                          Your Score:{" "}
                          {
                            Object.entries(userAnswers).filter(
                              ([idx, answer]) =>
                                answer ===
                                examQuestions[parseInt(idx)].correctAnswer
                            ).length
                          }{" "}
                          / {examQuestions.length}
                        </p>
                      </div>
                      <div className="space-y-4">
                        {examQuestions.map((q, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl ${
                              userAnswers[idx] === q.correctAnswer
                                ? "bg-[#E5EDFF] border-2 border-[#004aad]"
                                : "bg-[#FFF1F1] border-2 border-[#FF4B4B]"
                            }`}
                          >
                            <p className="font-nunito font-bold text-[#4B4B4B]">
                              {q.question}
                            </p>
                            <p className="font-nunito mt-2 text-[#4B4B4B]">
                              Your answer: {q.options[userAnswers[idx]]}
                            </p>
                            <p className="font-nunito text-[#4B4B4B]">
                              Correct answer: {q.options[q.correctAnswer]}
                            </p>
                            <p className="font-nunito mt-2 text-[#777777]">
                              Explanation: {q.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                        <button
                          onClick={() => {
                            setCurrentQuestion(0);
                            setUserAnswers({});
                            setShowResults(false);
                            fetchExamQuestions();
                          }}
                          className="bg-[#004aad] text-white px-6 py-3 rounded-2xl font-nunito hover:bg-[#003a8d] shadow-lg border-b-4 border-[#003a8d] hover:border-[#002a6d] transition-all"
                        >
                          Try New Questions
                        </button>
                        <button
                          onClick={() => {
                            setCurrentQuestion(0);
                            setUserAnswers({});
                            setShowResults(false);
                          }}
                          className="bg-[#F5F8FF] text-[#004aad] px-6 py-3 rounded-2xl font-nunito hover:bg-[#E5EDFF] border-2 border-[#004aad] transition-all"
                        >
                          Review Questions
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58CC02]"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MainComponent;
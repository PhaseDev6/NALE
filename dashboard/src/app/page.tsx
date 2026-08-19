"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/classroom/main";

interface Student {
  id: string | number;
  name: string;
  status: string;
  lastIntervention: string;
  currentFriction?: number;
}

interface HistoryPoint {
  time: string;
  frictionScore: number;
}

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [wsStatus, setWsStatus] = useState("Connecting...");


  useEffect(() => {


  }, []);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setWsStatus("Live");
    ws.onclose = () => setWsStatus("Disconnected");
    ws.onerror = () => setWsStatus("Error connecting");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      
      setStudents(prev => {
        const existing = prev.find(s => s.id === data.student_id);
        if (existing) {
          return prev.map(s => s.id === data.student_id ? {
            ...s,
            status: data.is_anomalous ? 'High Friction' : 'Stable',
            lastIntervention: data.intervention || s.lastIntervention,
            currentFriction: data.friction_score
          } : s);
        } else {
          return [...prev, {
            id: data.student_id,
            name: data.student_name,
            status: data.is_anomalous ? 'High Friction' : 'Stable',
            lastIntervention: data.intervention || 'None today',
            currentFriction: data.friction_score
          }];
        }
      });

      if (selectedStudent && selectedStudent.id === data.student_id) {
        setHistoryData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            frictionScore: data.friction_score
          }];
          if (newData.length > 20) newData.shift();
          return newData;
        });
      }
    };

    return () => ws.close();
  }, [selectedStudent]);

  useEffect(() => {
    if (selectedStudent) {
      fetch(`${BACKEND_URL}/api/student/${selectedStudent.id}/history`)
        .then(res => res.json())
        .then(data => {
          const chartData = data.map((d: any) => ({
            time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            frictionScore: d.friction_score
          }));
          setHistoryData(chartData);
        })
        .catch(err => console.error(err));
    }
  }, [selectedStudent]);

  return (
    <div className="flex h-screen bg-[#F9F8F6] text-[#4A4A4A] font-sans selection:bg-[#E2E8F0]">
      
      {/* Sidebar Roster */}
      <div className="w-72 bg-[#F3F1EC] border-r border-[#E8E4DB] p-6 flex flex-col shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-10">
        <h1 className="text-2xl font-semibold mb-2 text-[#5C6B73] flex items-center gap-3">
          <Activity size={26} strokeWidth={1.5} /> NALE Portal
        </h1>
        <div className={`text-xs mb-8 px-2 py-1 rounded w-fit ${wsStatus === 'Live' ? 'bg-[#EDF5F1] text-[#69A27F]' : 'bg-[#FCF0EC] text-[#D97757]'}`}>
          WS: {wsStatus}
        </div>
        
        <h2 className="text-xs font-medium text-[#8D99AE] mb-4 uppercase tracking-widest">My Classroom</h2>
        
        {students.length === 0 ? (
          <p className="text-sm text-slate-400 p-2">Waiting for student telemetry...</p>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-300 ease-in-out ${
                  selectedStudent?.id === student.id 
                    ? 'bg-white shadow-sm border border-[#E8E4DB] text-[#4A4A4A]' 
                    : 'hover:bg-white/50 text-[#6B7280] border border-transparent'
                }`}
              >
                <span className="font-medium text-[15px]">{student.name}</span>
                {student.status === 'High Friction' && <AlertTriangle size={16} strokeWidth={2} className="text-[#D97757]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-10 overflow-y-auto">
        {!selectedStudent ? (
          <div className="h-full flex items-center justify-center text-[#8D99AE]">
            Select a student from the sidebar to view their live profile.
          </div>
        ) : (
          <>
            <header className="mb-10 flex justify-between items-end max-w-5xl mx-auto">
              <div>
                <h2 className="text-4xl font-semibold text-[#3D405B] tracking-tight">{selectedStudent.name}</h2>
                <p className="text-[#8D99AE] mt-2 text-lg font-light">Real-time cognitive load & ambient telemetry</p>
              </div>
              <div className="flex gap-4">
                {/* Status Card */}
                <div className="bg-white px-5 py-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0EFEB] flex items-center gap-4">
                  <div className={`p-3 rounded-full ${selectedStudent.status === 'High Friction' ? 'bg-[#FCF0EC] text-[#D97757]' : 'bg-[#EDF5F1] text-[#69A27F]'}`}>
                    {selectedStudent.status === 'High Friction' ? <AlertTriangle size={24} strokeWidth={1.5} /> : <CheckCircle size={24} strokeWidth={1.5} />}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#8D99AE] uppercase font-bold tracking-wider">Current State</p>
                    <p className={`font-medium text-lg ${selectedStudent.status === 'High Friction' ? 'text-[#C45E3D]' : 'text-[#4F8663]'}`}>{selectedStudent.status}</p>
                  </div>
                </div>
                
                {/* Intervention Card */}
                <div className="bg-white px-5 py-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0EFEB] flex items-center gap-4">
                  <div className="p-3 rounded-full bg-[#F0F4F8] text-[#5C6B73]">
                    <Clock size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#8D99AE] uppercase font-bold tracking-wider">Last Intervention</p>
                    <p className="font-medium text-lg text-[#3D405B]">{selectedStudent.lastIntervention}</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Chart Section */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-[#F0EFEB] mb-8 max-w-5xl mx-auto">
              <h3 className="text-xl font-medium mb-6 text-[#5C6B73] flex items-center gap-2">
                <Activity size={22} strokeWidth={1.5} /> Cognitive Friction Timeline
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#F0EFEB" vertical={false} />
                    <XAxis dataKey="time" stroke="#8D99AE" axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis stroke="#8D99AE" axisLine={false} tickLine={false} tickMargin={10} domain={[0, 1.2]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.95)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line 
                      type="monotone" 
                      name="Friction Score"
                      dataKey="frictionScore" 
                      stroke="#8390FA" 
                      strokeWidth={4}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} 
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actionable Insights */}
            <div className="bg-[#F8F9FA] p-8 rounded-3xl border border-[#E9ECEF] max-w-5xl mx-auto flex gap-6 items-start">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#E9ECEF]">
                <Users size={28} className="text-[#8D99AE]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#3D405B] mb-2">Automated Pedagogical Insight</h3>
                <p className="text-[#5C6B73] text-[15px] leading-relaxed">
                  {selectedStudent.status === 'High Friction' 
                    ? `System detected high cognitive load (Score: ${selectedStudent.currentFriction?.toFixed(2)}). Applied intervention: ${selectedStudent.lastIntervention}. Recommendation: Monitor fatigue levels.`
                    : `Student is maintaining a stable cognitive load baseline. No interventions are required currently. Reading flow is optimal.`}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
    <div className="flex h-screen bg-slate-50 text-slate-900">
      
      
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-2 text-indigo-600 flex items-center gap-2">
          <img src="/logo.png" alt="NeuroLens Logo" className="w-8 h-8" /> NeuroLens Portal
        </h1>
        <div className={`text-xs mb-6 px-2 py-1 rounded w-fit ${wsStatus === 'Live' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          WS: {wsStatus}
        </div>
        <h2 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">My Classroom</h2>
        
        {students.length === 0 ? (
          <p className="text-sm text-slate-400 p-2">Waiting for student telemetry...</p>
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                  selectedStudent?.id === student.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'
                } ${student.status === 'High Friction' ? 'border-amber-300 bg-amber-50' : ''}`}
              >
                <span className="font-medium">{student.name}</span>
                {student.status === 'High Friction' && <AlertTriangle size={16} className="text-amber-500 animate-pulse" />}
              </button>
            ))}
          </div>
        )}
      </div>

      
      <div className="flex-1 p-8 overflow-y-auto">
        {!selectedStudent ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            Select a student from the sidebar to view their live profile.
          </div>
        ) : (
          <>
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">{selectedStudent.name}'s Profile</h2>
                <p className="text-slate-500 mt-1">Real-time cognitive load & ambient telemetry</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className={`p-2 rounded-full ${selectedStudent.status === 'High Friction' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {selectedStudent.status === 'High Friction' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Current State</p>
                    <p className="font-bold text-lg">{selectedStudent.status}</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Last Intervention</p>
                    <p className="font-bold text-lg">{selectedStudent.lastIntervention}</p>
                  </div>
                </div>
              </div>
            </header>

            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity size={20} className="text-indigo-500"/> Cognitive Friction Timeline
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 1.2]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      name="Friction Score"
                      dataKey="frictionScore" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      activeDot={{ r: 8 }} 
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            
            <div className={`p-6 rounded-xl border ${selectedStudent.status === 'High Friction' ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-100'}`}>
              <h3 className={`text-lg font-bold mb-2 ${selectedStudent.status === 'High Friction' ? 'text-amber-900' : 'text-indigo-900'}`}>
                Automated Pedagogical Insight
              </h3>
              <p className={selectedStudent.status === 'High Friction' ? 'text-amber-800' : 'text-indigo-800'}>
                {selectedStudent.status === 'High Friction' 
                  ? `System detected high cognitive load (Score: ${selectedStudent.currentFriction?.toFixed(2)}). Applied intervention: ${selectedStudent.lastIntervention}. Monitoring for improvement.`
                  : `Student is maintaining a baseline cognitive load. No active interventions required.`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



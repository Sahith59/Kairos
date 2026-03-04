"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Activity, CheckCircle, Clock, ShieldAlert, Cpu, Terminal } from 'lucide-react';
import { format } from 'date-fns';

type LogEvent = {
    id: string;
    service: string;
    level: string;
    message: string;
    timestamp: string;
};

type RCAEvent = {
    id: string;
    service: string;
    error: string;
    report: string;
    timestamp: string;
};

export default function Dashboard() {
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [reports, setReports] = useState<RCAEvent[]>([]);
    const [investigating, setInvestigating] = useState<string | null>(null);
    const [highlightedReportId, setHighlightedReportId] = useState<string | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom of logs when new logs arrive
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            ws.current?.close();
        };
    }, []);

    const connectWebSocket = () => {
        if (ws.current) ws.current.close();

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001/ws';
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('Connected to LogSage WebSocket');
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const uuid = Math.random().toString(36).substring(7);

                if (data.type === 'log_ingested') {
                    setLogs((prev) => [...prev, { id: uuid, ...data.data }].slice(-50)); // Keep last 50 logs
                } else if (data.type === 'anomaly_detected') {
                    setInvestigating(data.data.message);
                } else if (data.type === 'rca_generated') {
                    setInvestigating(null);
                    setReports((prev) => [
                        { id: uuid, ...data.data, timestamp: new Date().toISOString() },
                        ...prev
                    ]);
                }
            } catch (e) {
                console.error('Error parsing WebSocket message', e);
            }
        };

        ws.current.onclose = () => {
            console.log('Disconnected from WebSocket. Reconnecting in 3s...');
            setTimeout(connectWebSocket, 3000);
        };
    };

    const getLevelColor = (level: string) => {
        switch (level.toUpperCase()) {
            case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'ERROR': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            case 'WARN': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            default: return 'bg-neutral-800 text-neutral-300 border-neutral-700';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">

            {/* Logs Stream Panel */}
            <div className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 p-4 border-b border-neutral-800 bg-neutral-900">
                    <Terminal size={18} className="text-cyan-400" />
                    <h2 className="font-semibold text-lg">Live Firehose</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
                    <AnimatePresence initial={false}>
                        {logs.map((log) => {
                            const hasReport = reports.some(r => r.error === log.message);
                            return (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => {
                                        const reportId = reports.find(r => r.error === log.message)?.id;
                                        if (reportId) {
                                            document.getElementById(`report-${reportId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            setHighlightedReportId(reportId);
                                            setTimeout(() => setHighlightedReportId(null), 2000);
                                        }
                                    }}
                                    className={`p-3 rounded-md border backdrop-blur-sm shadow-sm transition-all ${getLevelColor(log.level)} ${hasReport ? 'cursor-pointer hover:brightness-125 active:scale-[0.98] ring-1 ring-white/20' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-xs px-2 py-0.5 rounded-sm bg-black/40">
                                            {log.service}
                                        </span>
                                        <span className="text-xs opacity-75">
                                            {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss.SSS') : 'N/A'}
                                        </span>
                                    </div>
                                    <p className="leading-tight break-words">{log.message}</p>
                                    {hasReport && <p className="text-[10px] mt-2 text-cyan-400 font-semibold opacity-80 flex justify-end">↳ Click to view Analysis</p>}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* AI Inspector Panel */}
            <div className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur overflow-hidden shadow-2xl relative">
                <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900 z-10">
                    <div className="flex items-center gap-2">
                        <Cpu size={18} className="text-purple-400" />
                        <h2 className="font-semibold text-lg">LogSage RAG Analyzer</h2>
                    </div>
                    {investigating && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs"
                        >
                            <Activity size={12} className="animate-spin duration-3000" />
                            <span>Analyzing Anomaly...</span>
                        </motion.div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                        {reports.map((report) => (
                            <motion.div
                                key={report.id}
                                id={`report-${report.id}`}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`rounded-lg border bg-black/60 overflow-hidden transition-all duration-500 ${highlightedReportId === report.id
                                    ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400 scale-[1.02] z-10 relative'
                                    : 'border-purple-500/30 shadow-lg shadow-purple-900/20'
                                    }`}
                            >
                                <div className={`p-3 bg-gradient-to-r ${highlightedReportId === report.id ? 'from-cyan-900/40' : 'from-purple-900/40'
                                    } to-transparent border-b ${highlightedReportId === report.id ? 'border-cyan-500/30' : 'border-purple-500/20'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldAlert size={16} className="text-red-400" />
                                        <span className="text-sm font-semibold text-neutral-200">Incident Detected</span>
                                    </div>
                                    <p className="text-xs text-red-300 font-mono">"{report.error}"</p>
                                </div>

                                <div className="p-4 prose prose-invert prose-sm max-w-none prose-p:text-neutral-300 prose-headings:text-neutral-100 prose-a:text-purple-400 prose-strong:text-emerald-300">
                                    {/* Parse Markdown-like text safely for the dashboard (very simple parse) */}
                                    {report.report.split('\n').map((line, idx) => {
                                        if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
                                            return <h4 key={idx} className="mt-4 mb-2">{line}</h4>;
                                        }
                                        if (line.includes('**')) {
                                            // naive bold parse
                                            const parts = line.split('**');
                                            return <p key={idx}>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</p>;
                                        }
                                        return <p key={idx} className="mb-2 whitespace-pre-wrap leading-relaxed">{line}</p>;
                                    })}
                                </div>
                                <div className="p-2 border-t border-purple-500/20 bg-purple-900/10 flex justify-between items-center text-xs text-neutral-500">
                                    <span>Processed by Llama 3 via Ollama</span>
                                    <span>{format(new Date(report.timestamp), 'HH:mm:ss')}</span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {reports.length === 0 && !investigating && (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4 opacity-50">
                            <CheckCircle size={48} className="text-emerald-500/50" />
                            <p>System is healthy. LLM standing by.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

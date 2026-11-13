import { useGlobalStore } from '@/store/useGlobalStore';

export default function LogsPanel() {
    const logs = useGlobalStore((s) => s.logs);

    return (
        <div className="bg-black text-green-400 font-mono text-sm h-64 overflow-auto p-3 rounded-lg shadow">
            {logs.length === 0 ? (
                <div className="text-gray-400">No logs yet...</div>
            ) : (
                logs.map((log, i) => (
                    <div key={i}>
                        <span className="text-gray-500">{log.timestamp} </span>
                        <span className="font-bold">[{log.level}]</span> {log.message}
                    </div>
                ))
            )}
        </div>
    );
}

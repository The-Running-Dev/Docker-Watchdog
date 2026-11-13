import { useGlobalStore } from '@/store/useGlobalStore';

export default function RealTimeStatusBar() {
    const status = useGlobalStore((s) => s.status);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-2 text-sm text-center">
            WebSocket: <span className="font-bold">{status}</span>
        </div>
    );
}
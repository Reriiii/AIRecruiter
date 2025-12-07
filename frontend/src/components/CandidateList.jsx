import React, { useEffect, useState } from 'react';
import { getAllCandidates } from '../services/api';
import CandidateCard from './CandidateCard';

const CandidateList = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
    try {
        setLoading(true);

        const data = await getAllCandidates(100);
        console.log("RAW BACKEND DATA:", data);

        // ✅ DATA FORMAT THỰC TẾ TỪ BACKEND CỦA BẠN
        if (!data?.candidates || !Array.isArray(data.candidates)) {
        throw new Error("Sai format dữ liệu từ backend");
        }

        const formatted = data.candidates.map(item => {
        const meta = item.metadata || {};

        return {
            id: item.id,
            ...meta,
            skills: meta.skills_list
            ? meta.skills_list.split(',').map(s => s.trim())
            : []
        };
        });

        setCandidates(formatted);

    } catch (err) {
        console.error("LOAD CANDIDATES ERROR:", err);

        setError(
        err.response?.data?.detail ||
        err.message ||
        'Không thể tải danh sách ứng viên'
        );
    } finally {
        setLoading(false);
    }
    };


    if (loading) {
        return <div className="text-center py-8 text-gray-500">Đang tải danh sách CV...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">{error}</div>;
    }

    if (candidates.length === 0) {
        return <div className="text-center py-8 text-gray-500">Chưa có CV nào trong hệ thống</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {candidates.map(candidate => (
            <CandidateCard key={candidate.id} candidate={candidate} />
        ))}
        </div>
    );
};

export default CandidateList;

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { contentService } from '@/services/contentService';

export function useContent(blogId) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const fetchContent = async () => {
    if (!currentUser?.uid || !blogId) {
      setContent([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await contentService.fetchAllContent(currentUser.uid, blogId);
      setContent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [currentUser?.uid, blogId]);

  return {
    content,
    loading,
    error,
    refetch: fetchContent
  };
}

export function useContentStats(blogId) {
  const [stats, setStats] = useState({
    totalContent: 0,
    publishedContent: 0,
    draftContent: 0,
    recentContent: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.uid || !blogId) {
        setStats({
          totalContent: 0,
          publishedContent: 0,
          draftContent: 0,
          recentContent: 0
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await contentService.getContentStats(currentUser.uid, blogId);
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser?.uid, blogId]);

  return { stats, loading, error };
}

export function useContentById(id, blogId) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!id || !currentUser?.uid || !blogId) {
      setContent(null);
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await contentService.fetchContentById(currentUser.uid, id, blogId);
        setContent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, currentUser?.uid, blogId]);

  return { content, loading, error };
}
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { API } from '@/App';
import { Calendar, BookOpen } from 'lucide-react';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/blog`);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12" data-testid="blog-header">
          <BookOpen className="w-16 h-16 text-[#00ff9d] mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
            Блог
          </h1>
          <p className="text-[#8b949e] max-w-2xl mx-auto">
            Новости, обзоры и гайды по играм
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 text-[#8b949e]" data-testid="no-posts">
            Публикаций пока нет
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="blog-posts-grid">
            {posts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group glass-panel rounded-xl overflow-hidden hover:border-[#00ff9d] transition-all"
                data-testid={`blog-post-${post.id}`}
              >
                {post.image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-[#00ff9d] transition-colors" style={{ fontFamily: 'Unbounded' }}>
                    {post.title}
                  </h3>
                  <div className="flex items-center text-sm text-[#8b949e] mb-3">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(post.published_at).toLocaleDateString()}
                  </div>
                  <p className="text-[#8b949e] line-clamp-3">
                    {post.content.substring(0, 150)}...
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
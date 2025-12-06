import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { API } from '@/App';
import { Calendar, User } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    try {
      const response = await axios.get(`${API}/blog/${slug}`);
      setPost(response.data);
    } catch (error) {
      console.error('Failed to fetch blog post:', error);
    }
  };

  if (!post) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-[#00ff9d] text-xl">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="blog-post">
        {post.image && (
          <div className="aspect-video rounded-2xl overflow-hidden mb-8">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="text-4xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }} data-testid="post-title">
          {post.title}
        </h1>

        <div className="flex items-center space-x-4 text-sm text-[#8b949e] mb-8 pb-8 border-b border-[#30363d]">
          <span className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(post.published_at).toLocaleDateString()}
          </span>
        </div>

        <div className="prose prose-invert max-w-none" data-testid="post-content">
          {post.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-[#8b949e] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </Layout>
  );
}
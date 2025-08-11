import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Calendar, User, Tag, ArrowLeft, Eye, Clock, FileText, Share2, Bookmark } from 'lucide-react';
import { ContentPreviewSkeleton } from '@/components/shared/SkeletonLoader';
import { FeaturedImage, GalleryImage } from '@/components/shared/ProgressiveImage';
import { useImageLoader } from '@/hooks/useImageLoader';

export default function ContentPreviewPage() {
  const { uid, blogId, slug } = useParams();
  const [content, setContent] = useState(null);
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContent();
  }, [uid, blogId, slug]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${window.location.origin}/users/${uid}/blogs/${blogId}/api/content.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      // Handle both old format (array) and new format (object with data property)
      const allContentData = Array.isArray(responseData) ? responseData : responseData.data || [];
      const foundContent = allContentData.find(item => item.slug === slug);
      
      if (!foundContent) {
        throw new Error('Content not found');
      }
      
      setContent(foundContent);
      setAllContent(allContentData);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRelatedContent = () => {
    return allContent
      .filter(item => item.id !== content?.id && item.status === 'published')
      .slice(0, 6);
  };

  const getReadingTime = (content) => {
    const wordsPerMinute = 200;
    const words = content?.split(' ').length || 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };


  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-lg w-full text-center p-8">
          <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Content Not Found</h1>
            <p className="text-gray-600 mb-8 text-lg">{error}</p>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <nav className="flex items-center justify-between">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium group"
            >
              <div className="p-2 rounded-lg group-hover:bg-gray-100 transition-colors duration-200 mr-2">
                <ArrowLeft className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <Eye className="h-4 w-4 mr-2" />
                Preview Mode
              </span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      {loading ? (
        <ContentPreviewSkeleton />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-16">
              <article className="max-w-4xl mx-auto">
                {/* Article Header */}
                <header className="mb-12 sm:mb-16 lg:mb-20">
                  {/* Status and Breadcrumb */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-12">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                        content?.status === 'published' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        {content?.status || 'draft'}
                      </span>
                      {content?.categories?.map((category, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {category}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-lg border">
                      /{content?.slug}
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 sm:mb-12 leading-tight tracking-tight">
                    {content?.title}
                  </h1>

                  {/* Enhanced Meta Information */}
                  <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-gray-600 mb-8 sm:mb-12 pb-8 sm:pb-12 border-b border-gray-200">
                    {content?.author && (
                      <div className="flex items-center group">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                          <User className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-semibold text-gray-900">{content.author}</div>
                          <div className="text-sm text-gray-500">Author</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-base font-medium text-gray-900">{formatDate(content?.createdAt)}</div>
                        <div className="text-sm text-gray-500">Published</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Clock className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-base font-medium text-gray-900">{getReadingTime(content?.content)}</div>
                        <div className="text-sm text-gray-500">Reading time</div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {content?.tags?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-8 sm:mb-12">
                      <Tag className="h-5 w-5 text-gray-500" />
                      <div className="flex flex-wrap gap-2">
                        {content.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors duration-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </header>

                {/* Featured Image */}
                {content?.featuredImageUrl && (
                  <div className="mb-12 sm:mb-16 lg:mb-20">
                    <EnhancedFeaturedImage
                      src={content.featuredImageUrl}
                      alt={content.title}
                      className="max-h-[70vh] shadow-2xl"
                      debug={true}
                    />
                  </div>
                )}

                {/* Content Body */}
                <div className="mb-12 sm:mb-16 lg:mb-20">
                  <div className="prose prose-lg sm:prose-xl prose-gray max-w-none markdown-content">
                    <ReactMarkdown>
                      {content?.content || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              </article>

              {/* API Data Sections */}
              <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
                {/* Meta Description (API Field) */}
                {content?.metaDescription && (
                  <div className="border-t border-gray-200 pt-8 lg:pt-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">API Data: Meta Description</h2>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-blue-100">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        metaDescription Field
                      </h3>
                      <p className="text-gray-700 text-lg sm:text-xl leading-relaxed italic">{content.metaDescription}</p>
                    </div>
                  </div>
                )}

                {/* SEO Information (API Fields) */}
                {(content?.seoTitle || content?.keywords?.length > 0) && (
                  <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">API Data: SEO Fields</h2>
                    <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
                      <div className="space-y-4">
                        {content?.seoTitle && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-base font-semibold text-gray-700 min-w-fit">seoTitle:</span>
                            <span className="text-gray-600 text-base">{content.seoTitle}</span>
                          </div>
                        )}
                        {content?.keywords?.length > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                            <span className="text-base font-semibold text-gray-700 min-w-fit">keywords:</span>
                            <div className="flex flex-wrap gap-2">
                              {content.keywords.map((keyword, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-300"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Social Actions */}
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8 border-t border-b border-gray-200">
                    <p className="text-lg font-medium text-gray-700">Enjoyed this article?</p>
                    <div className="flex items-center space-x-4">
                      <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                        <Share2 className="h-5 w-5 mr-2" />
                        Share
                      </button>
                      <button className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 border border-gray-300">
                        <Bookmark className="h-5 w-5 mr-2" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Related Content Section */}
          <RelatedContentSection 
            allContent={allContent}
            currentContentId={content?.id}
            uid={uid}
            blogId={blogId}
            formatDate={formatDate}
          />
      </main>
      )}
    </div>
  );
}

// Separate component for related content to avoid re-rendering during loading
function RelatedContentSection({ allContent, currentContentId, uid, blogId, formatDate }) {
  const relatedContent = allContent
    .filter(item => item.id !== currentContentId && item.status === 'published')
    .slice(0, 6);

  if (relatedContent.length === 0) {
    return null;
  }

  return (
    <section className="mt-20 sm:mt-24 lg:mt-32">
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">Related Content</h2>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          More content from the API
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
        {relatedContent.map((item) => (
          <Link
            key={item.id}
            to={`/preview/content/${uid}/${blogId}/${item.slug}`}
            className="group block bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            {item.featuredImageUrl ? (
              <EnhancedGalleryImage
                src={item.featuredImageUrl}
                alt={item.title}
                className="aspect-[4/3] group-hover:scale-110 transition-transform duration-500"
                debug={true}
              />
            ) : (
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <FileText className="h-16 w-16 text-gray-400" />
              </div>
            )}
            
            <div className="p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                {item.title}
              </h3>
              
              {item.metaDescription && (
                <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 line-clamp-3 leading-relaxed">
                  {item.metaDescription}
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  {item.author && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span>{item.author}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
                
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  item.status === 'published' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="text-center mt-12 sm:mt-16">
        <Link
          to="/dashboard/manage"
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
        >
          View All Content
          <ArrowLeft className="ml-3 h-6 w-6 transform rotate-180" />
        </Link>
      </div>
    </section>
  );
}

// Enhanced image components with debugging
function EnhancedFeaturedImage({ src, alt, className = '', debug = false }) {
  const { loading, error, imageData, retry } = useImageLoader(src);
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-8 text-center ${className}`}>
        <div className="text-red-600 mb-4">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-medium">Image failed to load</p>
          {debug && <p className="text-sm mt-2">{error}</p>}
        </div>
        <button onClick={retry} className="btn-secondary btn-sm">
          Retry
        </button>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className={`bg-muted rounded-xl ${className}`} style={{ minHeight: '300px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading image...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <FeaturedImage
      src={src}
      alt={alt}
      className={className}
      debug={debug}
    />
  );
}

function EnhancedGalleryImage({ src, alt, className = '', debug = false }) {
  const { loading, error, retry } = useImageLoader(src);
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <FileText className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="text-xs text-red-600">Failed to load</p>
          {debug && (
            <button onClick={retry} className="text-xs text-blue-600 hover:underline mt-1">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className={`bg-muted rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-full">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  return (
    <GalleryImage
      src={src}
      alt={alt}
      className={className}
      debug={debug}
    />
  );
}
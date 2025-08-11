import React from 'react';
import { Search, Target, TrendingUp, Eye, Zap, BookOpen, Users, Globe, Clock, Star } from 'lucide-react';

export default function TipsPage() {
  const seoTips = [
    {
      icon: Search,
      title: "Keyword Research & Strategy",
      description: "Master the foundation of SEO blogging with effective keyword research and implementation.",
      points: [
        "Use tools like Google Keyword Planner, Ahrefs, or SEMrush for keyword research",
        "Target long-tail keywords (3-4 words) for better ranking opportunities",
        "Include primary keyword in title, first paragraph, and naturally throughout content",
        "Use LSI (Latent Semantic Indexing) keywords to support your main keyword",
        "Aim for keyword density of 1-2% to avoid over-optimization",
        "Research competitor keywords and find content gaps to exploit"
      ]
    },
    {
      icon: Target,
      title: "On-Page SEO Optimization",
      description: "Optimize every element of your blog post to rank higher in search results.",
      points: [
        "Write compelling title tags under 60 characters with primary keyword",
        "Create meta descriptions 150-160 characters that encourage clicks",
        "Use H1 for main title, H2 for sections, H3 for subsections",
        "Optimize URL slugs to be short, descriptive, and keyword-rich",
        "Add alt text to all images with descriptive keywords",
        "Use internal linking to connect related content and boost page authority"
      ]
    },
    {
      icon: BookOpen,
      title: "Content Structure for SEO",
      description: "Structure your content to satisfy both search engines and readers.",
      points: [
        "Start with a compelling introduction that includes your main keyword",
        "Use the inverted pyramid structure: most important info first",
        "Break content into scannable sections with descriptive subheadings",
        "Include bullet points and numbered lists for better readability",
        "Aim for 1,500+ words for comprehensive coverage and better rankings",
        "End with a strong conclusion that summarizes key points and includes CTA"
      ]
    },
    {
      icon: Globe,
      title: "Technical SEO Essentials",
      description: "Technical factors that significantly impact your blog's search performance.",
      points: [
        "Ensure fast page loading speed (under 3 seconds)",
        "Make your blog mobile-responsive and mobile-first",
        "Use HTTPS for secure connection and SEO boost",
        "Create and submit XML sitemap to search engines",
        "Implement schema markup for rich snippets",
        "Fix broken links and 404 errors regularly"
      ]
    },
    {
      icon: TrendingUp,
      title: "Content Marketing Strategy",
      description: "Build authority and drive organic traffic through strategic content marketing.",
      points: [
        "Create topic clusters around main keywords to build topical authority",
        "Publish consistently to maintain search engine crawling frequency",
        "Update old content regularly to keep it fresh and relevant",
        "Create evergreen content that remains valuable over time",
        "Use Google Trends to identify trending topics in your niche",
        "Repurpose content across different formats (videos, infographics, podcasts)"
      ]
    },
    {
      icon: Users,
      title: "User Experience & Engagement",
      description: "Improve user signals that search engines use as ranking factors.",
      points: [
        "Reduce bounce rate with engaging introductions and clear navigation",
        "Increase dwell time with comprehensive, valuable content",
        "Use clear call-to-actions to guide user behavior",
        "Implement related posts to keep users on your site longer",
        "Enable comments and respond to build community engagement",
        "Use readable fonts, proper spacing, and visual hierarchy"
      ]
    },
    {
      icon: Eye,
      title: "Featured Snippets & SERP Features",
      description: "Optimize content to appear in Google's featured snippets and special search features.",
      points: [
        "Structure content to answer specific questions clearly",
        "Use numbered lists and bullet points for step-by-step guides",
        "Create FAQ sections to target question-based queries",
        "Include tables and comparison charts for data-heavy topics",
        "Write concise definitions for 'what is' type queries",
        "Optimize for voice search with conversational, natural language"
      ]
    },
    {
      icon: Star,
      title: "Link Building & Authority",
      description: "Build domain authority through strategic link building and content promotion.",
      points: [
        "Create linkable assets like original research, tools, or comprehensive guides",
        "Reach out to relevant websites for guest posting opportunities",
        "Build relationships with other bloggers and industry influencers",
        "Use internal linking to distribute page authority throughout your site",
        "Monitor and disavow toxic backlinks that could harm your rankings",
        "Participate in industry forums and communities to build natural links"
      ]
    }
  ];

  const quickSeoTips = [
    "Include your target keyword in the first 100 words of your post",
    "Use Google Search Console to identify and fix crawl errors",
    "Optimize images by compressing them and using descriptive filenames",
    "Create compelling meta titles that encourage clicks from search results",
    "Use Google Analytics to track organic traffic and user behavior",
    "Research 'People Also Ask' questions for content ideas",
    "Write for humans first, search engines second",
    "Use tools like Yoast SEO or RankMath for on-page optimization",
    "Create content that matches search intent (informational, commercial, navigational)",
    "Monitor your competitors' top-performing content for inspiration",
    "Use social media to amplify your content and drive traffic",
    "Create topic clusters by linking related content together"
  ];

  const contentTypes = [
    {
      type: "How-to Guides",
      description: "Step-by-step tutorials that solve specific problems",
      seoTips: ["Use numbered lists", "Include screenshots", "Target 'how to' keywords"]
    },
    {
      type: "List Posts",
      description: "Curated lists that provide value and are highly shareable",
      seoTips: ["Use numbers in titles", "Include compelling subheadings", "Make lists comprehensive"]
    },
    {
      type: "Ultimate Guides",
      description: "Comprehensive resources that cover topics in-depth",
      seoTips: ["Target high-volume keywords", "Create extensive content (3000+ words)", "Include table of contents"]
    },
    {
      type: "Case Studies",
      description: "Real-world examples that demonstrate results and build trust",
      seoTips: ["Include specific data and metrics", "Use before/after comparisons", "Target industry-specific keywords"]
    },
    {
      type: "Reviews & Comparisons",
      description: "Product or service evaluations that help users make decisions",
      seoTips: ["Target commercial keywords", "Include pros and cons", "Use comparison tables"]
    },
    {
      type: "News & Trends",
      description: "Timely content that capitalizes on current events and trends",
      seoTips: ["Publish quickly for trending topics", "Use Google Trends", "Include relevant hashtags"]
    }
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">SEO Blogging Tips</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Master SEO blogging with proven strategies to rank higher, drive organic traffic, and grow your audience
        </p>
      </div>

      {/* Main SEO Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {seoTips.map((tip, index) => (
          <div key={index} className="card">
            <div className="card-header">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <tip.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="card-title text-xl">{tip.title}</h3>
              </div>
              <p className="card-description text-base leading-relaxed">{tip.description}</p>
            </div>
            <div className="card-content">
              <ul className="space-y-4">
                {tip.points.map((point, pointIndex) => (
                  <li key={pointIndex} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-5 flex-shrink-0"></div>
                    <span className="text-base text-foreground leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Quick SEO Tips */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="card-title">Quick SEO Wins</h2>
          </div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {quickSeoTips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-4 p-6 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                <span className="text-base text-foreground leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Types for SEO */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">High-Performing Content Types</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {contentTypes.map((content, index) => (
              <div key={index} className="p-8 border border-border rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">{content.type}</h3>
                <p className="text-base text-muted-foreground mb-6 leading-relaxed">{content.description}</p>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">SEO Tips:</h4>
                  <ul className="space-y-2">
                    {content.seoTips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                        <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEO Checklist */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Pre-Publish SEO Checklist</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-6">Content Optimization</h3>
              <ul className="space-y-4">
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Primary keyword in title and first paragraph</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Meta description under 160 characters</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Proper heading structure (H1, H2, H3)</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Internal links to related content</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">External links to authoritative sources</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-6">Technical SEO</h3>
              <ul className="space-y-4">
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">SEO-friendly URL slug</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Alt text for all images</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Optimized featured image</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Categories and tags assigned</span>
                </li>
                <li className="flex items-center space-x-4">
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                  <span className="text-base leading-relaxed">Content is mobile-friendly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Tools */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Essential SEO Tools</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-6">Free Tools</h3>
              <ul className="space-y-3">
                <li className="text-base text-muted-foreground leading-relaxed">• Google Search Console</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Google Analytics</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Google Keyword Planner</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Ubersuggest (limited free)</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Answer The Public</li>
              </ul>
            </div>
            <div className="p-8 border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-6">Premium Tools</h3>
              <ul className="space-y-3">
                <li className="text-base text-muted-foreground leading-relaxed">• Ahrefs</li>
                <li className="text-base text-muted-foreground leading-relaxed">• SEMrush</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Moz Pro</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Screaming Frog</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Surfer SEO</li>
              </ul>
            </div>
            <div className="p-8 border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-6">WordPress Plugins</h3>
              <ul className="space-y-3">
                <li className="text-base text-muted-foreground leading-relaxed">• Yoast SEO</li>
                <li className="text-base text-muted-foreground leading-relaxed">• RankMath</li>
                <li className="text-base text-muted-foreground leading-relaxed">• All in One SEO</li>
                <li className="text-base text-muted-foreground leading-relaxed">• Schema Pro</li>
                <li className="text-base text-muted-foreground leading-relaxed">• WP Rocket (speed)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
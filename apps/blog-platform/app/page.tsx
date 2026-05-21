import { blog } from "@/lib/source";

import { Container } from "@veriworkly/ui";

import { BlogHero } from "../features/landing/components/BlogHero";
import { PostsGrid } from "../features/landing/components/PostsGrid";
import { FAQSection } from "../features/landing/components/FAQSection";
import { CTASection } from "../features/landing/components/CTASection";
import { FeaturedPost } from "../features/landing/components/FeaturedPost";

const BlogHome = () => {
  const allPosts = blog
    .getPages()
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  const featuredPost = allPosts[0];
  const remainingPosts = allPosts.slice(1, 4);

  return (
    <div className="min-h-screen py-14 md:py-20">
      <Container className="space-y-12 md:space-y-20">
        <BlogHero postCount={allPosts.length} />

        {featuredPost && <FeaturedPost post={featuredPost} />}

        <PostsGrid posts={remainingPosts} />

        <FAQSection />

        <CTASection />
      </Container>
    </div>
  );
};

export default BlogHome;

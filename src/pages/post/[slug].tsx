import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';

import styles from './post.module.scss';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { RichText } from 'prismic-dom';

import { format } from 'date-fns';
import ptBr from 'date-fns/locale/pt-BR';

import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { ExitPreviewButton } from '../../components/ExitPreviewButton';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  prevPost: {
    uid: string;
    title: string;
  } | null;
  nextPost: {
    uid: string;
    title: string;
  } | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface ResponseData {
  content: {
    heading: string;
    body: string;
  }[];
  title: string;
  banner: {
    url: string;
  };
  author: string;
  subtitle: string;
}

interface PostProps {
  post: Post;
  preview: boolean;
}

export default function Post({ post, preview }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  useEffect(() => {
    let anchor = document.getElementById('inject-comments-for-uterances');

    if (!anchor.hasChildNodes()) {
      let script = document.createElement('script');
      script.setAttribute('src', 'https://utteranc.es/client.js');
      script.setAttribute('crossOrigin', 'anonymous');
      script.setAttribute('async', 'true');
      script.setAttribute('repo', 'Matheus-Days/Ignite-Blog-Challenge');
      script.setAttribute('issue-term', 'pathname');
      script.setAttribute('theme', 'photon-dark');

      anchor.appendChild(script);
    }

    return () => {
      anchor.innerHTML = '';
    };
  }, [router]);

  const headings = post.data.content.reduce((acc, curr) => {
    return acc + curr.heading + ' ';
  }, '');

  const bodies = post.data.content.reduce((acc, curr) => {
    return acc + RichText.asText(curr.body) + ' ';
  }, '');

  const words = (headings + bodies).split(/\s/);

  const readingTime = Math.ceil(words.length / 200);

  const content = post.data.content.reduce((acc, curr) => {
    return acc + `<h2>${curr.heading}</h2>` + RichText.asHtml(curr.body);
  }, '');

  return (
    <>
      <Head>
        <title> {post.data.title} | SpaceTraveling</title>
      </Head>

      <img className={styles.banner} src={post.data.banner.url} alt="Banner" />
      <main className={styles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <div className={styles.postData}>
            {!preview && (
              <time>
                <FiCalendar />{' '}
                {format(new Date(post.first_publication_date), 'd MMM yyyy', {
                  locale: ptBr,
                })}
              </time>
            )}
            <span>
              <FiUser /> {post.data.author}
            </span>
            <span>
              <FiClock /> {`${readingTime} min`}
            </span>
          </div>
          {post.first_publication_date !== post.last_publication_date && (
            <div className={styles.lastUpdate}>
              {format(
                new Date(post.last_publication_date),
                "'* editado em 'd MMM yyyy', às 'hh:mm",
                {
                  locale: ptBr,
                }
              )}
            </div>
          )}
          <div
            className={styles.postContent}
            dangerouslySetInnerHTML={{ __html: content }}
          />
          <br />
        </article>
        <div className={styles.pagination}>
          {post.prevPost ? (
            <Link href={`/post/${post.prevPost.uid}`}>
              <a className={styles.prevPost}>
                {post.prevPost.title}
                <p>Post anterior</p>
              </a>
            </Link>
          ) : (
            <div />
          )}
          {post.nextPost ? (
            <Link href={`/post/${post.nextPost.uid}`}>
              <a className={styles.nextPost}>
                {post.nextPost.title}
                <p>Próximo post</p>
              </a>
            </Link>
          ) : (
            <div />
          )}
        </div>
        <div id="inject-comments-for-uterances" />
        {preview && <ExitPreviewButton />}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query('');

  const paths = posts.results.map(post => {
    return { params: { slug: post.uid } };
  });

  return {
    paths: paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const { content, title, banner, author, subtitle } = response.data;

  const prevPost = (
    await prismic.query(Prismic.Predicates.at('document.type', 'posts'), {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date desc]',
    })
  ).results[0];

  const nextPost = (
    await prismic.query(Prismic.Predicates.at('document.type', 'posts'), {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date]',
    })
  ).results[0];

  const post = {
    uid: response.uid,
    data: {
      title,
      subtitle,
      banner: {
        url: banner.url,
      },
      author,
      content,
    },
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    prevPost: prevPost
      ? { uid: prevPost.uid, title: prevPost.data.title }
      : null,
    nextPost: nextPost
      ? { uid: nextPost.uid, title: nextPost.data.title }
      : null,
  };

  return {
    props: { post, preview },
    revalidate: 60,
  };
};

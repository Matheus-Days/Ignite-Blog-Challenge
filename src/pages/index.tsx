import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { getPrismicClient } from '../services/prismic';
import Prismic from '@prismicio/client';

import styles from './home.module.scss';

import { FiCalendar, FiUser } from 'react-icons/fi';

import { format } from 'date-fns';
import ptBr from 'date-fns/locale/pt-BR';

import { useState } from 'react';
import { useRouter } from 'next/router';

import { ExitPreviewButton } from '../components/ExitPreviewButton';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({ postsPagination, preview }: HomeProps) {
  const [nextPage, setNextPage] = useState(postsPagination.next_page);
  const [posts, setPosts] = useState(postsPagination.results);

  function getNextPage(nextPageUrl) {
    if (nextPageUrl)
      fetch(nextPageUrl)
        .then(response => response.json())
        .then(result => {
          setNextPage(result.next_page);

          const results = result.results.map(post => {
            return {
              uid: post.uid,
              first_publication_date: format(
                new Date(post.first_publication_date),
                'd MMMM yyyy',
                { locale: ptBr }
              ),
              data: {
                title: post.data.title,
                subtitle: post.data.subtitle,
                author: post.data.author,
              },
            };
          });

          setPosts([...posts, ...results]);
        })
        .catch(err => console.error(err));
  }

  return (
    <>
      <Head>
        <title>Home | SpaceTraveling</title>
      </Head>
      <main className={styles.container}>
        <div className={styles.posts}>
          {posts.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div>
                  <time>
                    <FiCalendar />{' '}
                    {format(
                      new Date(post.first_publication_date),
                      'd MMM yyyy',
                      { locale: ptBr }
                    )}
                  </time>
                  <span>
                    <FiUser /> {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          ))}
          {nextPage && (
            <button
              className={styles.nextPage}
              onClick={() => getNextPage(nextPage)}
            >
              Carregar mais posts
            </button>
          )}
        </div>
        {preview && <ExitPreviewButton />}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: [
        'posts.title',
        'posts.subtitle',
        'posts.author',
        'posts.first_publication_date',
      ],
      pageSize: 2,
      orderings: '[document.first_publication_date]',
    }
  );

  const results = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: { next_page: postsResponse.next_page, results },
      preview,
    },
  };
};

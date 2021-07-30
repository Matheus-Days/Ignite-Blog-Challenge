import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { RichText } from 'prismic-dom';

import { format } from 'date-fns';
import ptBr from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

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
            <time>
              <FiCalendar />{' '}
              {format(new Date(post.first_publication_date), 'd MMM yyyy', {
                locale: ptBr,
              })}
            </time>
            <span>
              <FiUser /> {post.data.author}
            </span>
            <span>
              <FiClock /> {`${readingTime} min`}
            </span>
          </div>
          <div
            className={styles.postContent}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      </main>
    </>
  );
}

export const getStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.uid'],
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => {
    return { params: { slug: `${post.uid}` } };
  });

  return {
    paths: paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();

  const { slug } = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const { content, title, banner, author, subtitle } = response.data;

  const post = {
    uid: response.uid,
    data: {
      title: title,
      subtitle: subtitle,
      banner: {
        url: banner.url,
      },
      author: author,
      content: content,
    },
    first_publication_date: response.first_publication_date,
  };

  return {
    props: { post },
    revalidate: 60,
  };
};

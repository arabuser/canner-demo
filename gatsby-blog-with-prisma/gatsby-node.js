const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID
} = require('gatsby/graphql');
const get = require('lodash/get');
const path = require('path');
const slug = require('slug');
const { request } = require('graphql-request');
const createNodeHelpers = require('gatsby-node-helpers').default;
const { createNodeFactory } = createNodeHelpers({ typePrefix: 'Prisma' });
const PrismaPostNode = createNodeFactory('Post');
const ENDPOINT = 'https://us1.prisma.sh/william-chang/prisma/dev';
const gravatar = require('gravatar');

exports.sourceNodes = async ({ boundActionCreators }) => {
  const { createNode } = boundActionCreators;
  // Create nodes here, generally by downloading data
  // from a remote API.
  const query = `{
    posts {
      id
      name
      postDate
      content
      author {
        id
        name
        email
      }
    }
  }`;
  const {posts} = await request(ENDPOINT, query);
  
  // Process data into nodes.
  posts.forEach(post => {
    return createNode(PrismaPostNode({
      slug: slug(post.name),
      ...post
    }))
  });
};

exports.setFieldsOnGraphQLNodeType = async ({ type }) => {
  if (type.name !== 'PrismaPost') {
    return;
  }
  return {
    author: {
      type: new GraphQLObjectType({
        name: 'author',
        fields: {
          id: {type: GraphQLID},
          name: {type: GraphQLString},
          email: {type: GraphQLString},
          thumb: {type: GraphQLString}
        }
      }),
      resolve(prismaPostNode) {
        const email = get(prismaPostNode, 'author.email');
        return {
          id: get(prismaPostNode, 'author.id'),
          name: get(prismaPostNode, 'author.name'),
          email,
          thumb: email ? gravatar.url(email, {d: 'retro'}) : null
        }
      }
    }
  }
}

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;
  const blogPost = path.resolve('./src/templates/blog-post.js');
  const result = await graphql(`
    query PrismaQuery {
      allPrismaPost(sort: {fields: [postDate], order: DESC}) {
        edges {
          node {
            id
            slug
            name
            content {
              html
            }
          }
        }
      }
    }
  `);

  // Create blog posts pages.
  const postEdges = result.data.allPrismaPost.edges;
  postEdges.forEach((postEdge, index) => {
    const post = postEdge.node;
    const previous = index === postEdges.length - 1 ? null : postEdges[index + 1].node;
    const next = index === 0 ? null : postEdges[index - 1].node;
    createPage({
      path: `/posts/${post.slug}/`,
      component: blogPost,
      context: {
        slug: post.slug,
        previous,
        next
      },
    });
  });
};

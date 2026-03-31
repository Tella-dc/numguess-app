import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
	console.log("AUTH START", {
		username: credentials?.username,
    hasPassword: !!credentials?.password,
  });
        if (!credentials?.username || !credentials?.password) {
 console.log("AUTH FAIL: missing credentials");     
     throw new Error('Username and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
console.log("AUTH USER:", user ? user.username : null);

        if (!user) {
console.log("AUTH FAIL: user not found");
          throw new Error('Invalid username or password');
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordValid) {
console.log("AUTH FAIL: bad password");
          throw new Error('Invalid username or password');
        }
	 console.log("AUTH SUCCESS:", user.username);
        return {
          id: user.id,
          username: user.username,
          role: user.role as any,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          username: token.username as string,
          role: token.role as any,
        };
      }
      return session;
    },
  },
};

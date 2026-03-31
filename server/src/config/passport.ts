import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import User from "../models/user.model";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value || "";
        const fullName = profile.displayName || "Google User";
        const googleId = profile.id;

        if (!email) {
          return done(new Error("Google account email not found"), false);
        }

        let user = await User.findOne({
          $or: [{ googleId }, { email }]
        });

        if (!user) {
          const generatedUsername = email.split("@")[0] + "_" + Date.now();

          user = await User.create({
            fullName,
            username: generatedUsername,
            email,
            googleId,
            avatarUrl,
            password: undefined
          });
        } else {
          if (!user.googleId) {
            user.googleId = googleId;
          }

          if (!user.avatarUrl && avatarUrl) {
            user.avatarUrl = avatarUrl;
          }

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, false);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error as Error, null);
  }
});

export default passport;
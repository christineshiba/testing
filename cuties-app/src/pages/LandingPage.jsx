import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './LandingPage.css';

const testimonials = [
  {
    text: "My best experience on cuties was clicking on my close friends profile and clicking \"apple\". One second later she sent me a message! contribute to it. Feeling good about meeting some interesting people in nearby etc. and also really good seeing so many people in my extended network on it!",
    author: "anonymous"
  },
  {
    text: "cuties is great - was super easy to find new friends from fey.",
    author: "fey"
  },
  {
    text: "i went on a date because of this app! it wasn't a great fit and it was pretty cold standing around outside, but it was fun! :)",
    author: "anonymous"
  },
  {
    text: "I'm so glad for this app! I'm a girl in LA and previously I made a lot of girl friends through joining running clubs in my neighborhood. Don't get me wrong I but I thoughts it was refreshing to have more spontaneous ideas, meaningful conversations that came from talking to people on this app who love the same things as me! The people on this app who I've connected with, listened and supported, are like the friends I was looking for this little (but growing!) LA have community we have going here :)",
    author: "anonymous"
  },
  {
    text: "By making a container for us to express ourselves around these points, you've indirectly made some way of exposing thoughts which have generally led to good things!",
    author: "anonymous"
  },
  {
    text: "yes. this. it's pretty cool. @kerryelise",
    author: "@kerryelise"
  },
  {
    text: "had to fun travel blog that started from cuties!",
    author: "jess"
  },
  {
    text: "been doing a Twitter mutual meetup out of cuties!",
    author: "sapphocles"
  },
  {
    text: "I'm going on two (maybe 3) dates in NYC this week because of cuties! A cutie texted me saying that we should hang \"sometime super impactful!\"",
    author: "anonymous"
  },
  {
    text: "I succumbed to the cutiesposting",
    author: "alph"
  },
  {
    text: "definitely liked it more than any other dating app I've been on",
    author: "anonymous"
  },
  {
    text: "sent updates on my experiences using Cuties app! (in case you less good)",
    author: "anonymous"
  },
  {
    text: "to anyone who's reading this, cuties is someone's dating app, it's amazing",
    author: "anonymous"
  },
  {
    text: "wow man, this is the first time I've felt actually heard and decently represented in an app",
    author: "adam"
  },
  {
    text: "i used your app to set up a hang out a date. Pretty nice experience getting!",
    author: "@mattixlius"
  },
  {
    text: "I just scheduled TWO dates with someone off the app 🥺 like we have met, but in we got so excited that we planned TWO things to do this week ☺️",
    author: "anonymous"
  },
  {
    text: "thank you girliesintech we tried building out every week introducing the idea of community!",
    author: "anonymous"
  },
  {
    text: "some hobbies and, my current sf housemate who i first saw on cuties before meeting in real life, is someone who i feel so comfortable with now and we talk to each other about our happenstance. He recognized me from the interview yesterday. So, if you...",
    author: "anonymous"
  },
  {
    text: "Forever indebted to @christineist",
    author: "@blainetjensen"
  },
  {
    text: "I did [join the app!] it's cute!",
    author: "@nbroeking"
  },
  {
    text: "I'm so glad this app less! yes. I never made a twitter profile before and this is one of my ways to try and reach out and what we had a few cuties and they're so happy :)",
    author: "anonymous"
  },
  {
    text: "i've met a got literally thanks to Cuties! app :) If i could, I would definitely log back on in if i wasn't logged back on in",
    author: "anonymous"
  },
  {
    text: "ive literally been on a dating app for a long time and the niceness of cuties is quite fun. i haven't quite the same you're hoping for & literally connect the corner to a chat with if you want",
    author: "anonymous"
  },
  {
    text: "Thank you for making cuties! I am still single but I am following a few great people on Instagram with someone! I found on cuties app and we're doing a call soon otherwise. Thanks for connecting us :)",
    author: "anonymous"
  },
  {
    text: "i tried cuties thing hard is killing me but at least im gonna die doing what i love which is going to do some basic communication on twitter and better dating apps til what a cooked bunch of people!",
    author: "anonymous"
  },
  {
    text: "Cuties! app is very good! big fan. didn't meet anyone specifically from it but it was fun and I'd certainly use it again!",
    author: "anonymous"
  },
  {
    text: "I heard from one of my friends that kim is on a cutie chatting with him today about the app!! hello!",
    author: "anonymous"
  },
  {
    text: "i was able to use your Cuties app to start up my friend",
    author: "ekun"
  },
  {
    text: "for better than any other app",
    author: "amon"
  },
  {
    text: "One of my simple joys in life is meeting remanded people from better, app they've their people who had a great day everyone in the cuties app and now one of my really good friends :) you hooked in a lot of 'just you :)'",
    author: "anonymous"
  },
  {
    text: "I went on 3 dates because of the app! I still am good friends with them without her community, one of which is now my gf and obviously I wouldn't have met her otherwise!",
    author: "anonymous"
  },
  {
    text: "may not find my friend and now one of my really good friends :) you hooked in lot of 'just you :)'",
    author: "anonymous"
  },
];

const LandingPage = () => {
  const { isAuthenticated } = useApp();

  return (
    <div className="landing-page">
      <section className="hero-simple">
        <h1 className="main-title">cuties!</h1>
        <p className="main-subtitle">
          Make IRL connections faster. Find the others within your existing community.
        </p>
        <Link
          to={isAuthenticated ? "/directory" : "/signup"}
          className="browse-button"
        >
          Browse
        </Link>
      </section>

      <section className="testimonials">
        <div className="testimonials-masonry">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="testimonial-card">
              <p className="testimonial-text">"{testimonial.text}"</p>
              <p className="testimonial-author">— {testimonial.author}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Cuties!</h3>
            <p>made by @christineist</p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <a href="#">FAQ</a>
            <a href="#">Customers</a>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Jobs</a>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <a href="#">FAQ</a>
            <a href="#">Contact us</a>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

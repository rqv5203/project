const { connectDB } = require('./db');
const app = require('./app');
const User = require('./models/User');
const Gif = require('./models/Gif');

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
   // Create indexes for the users collection
   await User.createIndexes();
   // Create indexes for the gifs collection
   await Gif.createIndexes();
   
   app.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
   });
});
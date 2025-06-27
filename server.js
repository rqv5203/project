const { connectDB } = require('./db');
const app = require('./app');
const User = require('./models/User');
const WeatherCollection = require('./models/WeatherCollection');

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
   // Create indexes for the users collection
   //await User.createIndexes();
   // Create indexes for the gifs collection
   //await Gif.createIndexes();
   // Create indexes for the weather collections collection
   //await WeatherCollection.createIndexes();
   
   app.listen(PORT, '0.0.0.0', () => {
      console.log(`server is running on port ${PORT}`);
   });
});
import gulp from 'gulp';
import getServer from '.';

gulp.task('server', (cb) => {
  console.log(process.env.PORT);
  getServer().listen(process.env.PORT || 4000, cb);
});

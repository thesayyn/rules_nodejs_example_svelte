clear
echo "console.log('$(date)')" > src/bust.js

yarn bazel build :build --worker_verbose

# yarn webpack -c webpack.config.js -o out --watch
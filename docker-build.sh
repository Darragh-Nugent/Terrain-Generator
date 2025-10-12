NAME=${1:-terrain} 

cd src/$NAME/
docker build -t $NAME -f $NAME.Dockerfile .
docker tag $NAME:latest 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/group-88-$NAME:latest
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/group-88-$NAME:latest

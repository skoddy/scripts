const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.aggregateComments = functions.firestore
    .document('posts/{postId}/comments/{commentId}')
    .onWrite(event => {

    const commentId = event.params.commentId; 
    const postId = event.params.postId;
    
    // ref to the parent document
    const docRef = admin.firestore().collection('posts').doc(postId)
    
    // get all comments and aggregate
    return docRef.collection('comments').orderBy('createdAt', 'desc')
         .get()
         .then(querySnapshot => {

            // get the total comment count
            const commentCount = querySnapshot.size

            const recentComments = []

            // add data from the 5 most recent comments to the array
            querySnapshot.forEach(doc => {
                recentComments.push( doc.data() )
            });

            recentComments.splice(5)

            // record last comment timestamp
            const lastActivity = recentComments[0].createdAt

            // data to update on the document
            const data = { commentCount, recentComments, lastActivity }
            
            // run update
            return docRef.update(data)
         })
         .catch(err => console.log(err) )
});

App Component TypeScript

The loadMore() method will call valueChanges() only when the user clicks the button. This will load the Firestore data lazily for the small percentage of users who want to see older comments.

import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument 
} from 'angularfire2/firestore';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {

  postRef: AngularFirestoreDocument<any>;
  post$: Observable<any>;

  commentsRef: AngularFirestoreCollection<any>;
  comments$: Observable<any>;

  formValue: string;

  constructor(private afs: AngularFirestore) { }

  ngOnInit() {
    this.postRef = this.afs.doc('posts/testPost')
    this.commentsRef = this.postRef.collection('comments', ref => ref.orderBy('createdAt', 'desc') )
    this.post$ = this.postRef.valueChanges();
  }

  addComment() {
    this.commentsRef.add({ content: this.formValue, createdAt: new Date() })
    this.formValue = '';
  }

  // Lazy Load the Firestore Collection
  loadMore() {
    this.comments$ = this.commentsRef.valueChanges();
  }

}

Html

Notice how I only show the post.recentComments when the comments$ Observable is not defined. If the user decides to load more, then the aggregated data is replaced with the full comments collection.

<div *ngIf="post$ | async as post">

  <h1>{{ post.title }}</h1>

  <p>{{ post.content }}</p>

  <p>Last Comment: {{ post.lastActivity }}</p><br>
  <p>Total Comments: {{ post.commentCount }}</p>

  <h3>Add your Comment</h3>

  <input [(ngModel)]="formValue" (keyup.enter)="addComment()">

  <h3>Recent Comments</h3>

  <!-- Aggregated comments on the post document -->
  <ng-container *ngIf="!comments$">
    <div *ngFor="let comment of post.recentComments">
      <p>{{ comment.content }}</p>
      <em>posted {{ comment.createdAt }}</em>
      <hr>
    </div>
  </ng-container>

  <!-- Firestore comment documents from the subcollection -->
  <div *ngFor="let comment of comments$ | async">
      <p>{{ comment.content }}</p>
      <em>posted {{ comment.createdAt }}</em>
      <hr>
  </div>

  <button (click)="loadMore()">
    Load all {{ post.commentCount }} comments
  </button>

</div>
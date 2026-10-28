<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\AdminNotifier;
use App\Services\ProductCatalog;
use App\Services\RateLimit;
use App\Services\WebPushService;
use App\Support\Json;
use App\Support\Text;
use Symfony\Component\HttpFoundation\Response;

// GET    /api/reviews[?productId=]
// POST   /api/reviews (create / update own review), /api/reviews/reply, /api/reviews/like
// DELETE /api/reviews/:id (admin)
class ReviewController extends ApiController
{
    protected function handle(string $method): Response
    {
        try {
            return match ($method) {
                'GET' => $this->list(),
                'POST' => $this->post(),
                'DELETE' => $this->destroy(),
                default => $this->notFound(),
            };
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    private function list(): Response
    {
        $q = Review::query()->orderByDesc('createdAt');
        if ($productId = $this->request->query('productId')) {
            $q->where('productId', (string) $productId);
        }
        return $this->ok($q->get()->map->toArray()->all());
    }

    private function post(): Response
    {
        $first = $this->seg(0);
        if ($limited = RateLimit::hit('review:'.($first ?? 'create').':'.$this->ip(), $first === 'like' ? 60 : 15, 15 * 60 * 1000)) {
            return $limited;
        }
        return match ($first) {
            'reply' => $this->reply(),
            'like' => $this->like(),
            null => $this->create(),
            default => $this->notFound(),
        };
    }

    private function reply(): Response
    {
        $body = $this->body();
        $reviewId = Text::s($body['reviewId'] ?? '');
        $text = mb_substr(trim(Text::s($body['text'] ?? '')), 0, 1000);
        if ($reviewId === '' || $text === '') {
            return $this->error('Missing reviewId or text/comment for reply.', 400);
        }

        // Only a signed-in admin can reply as the store; anyone else can't borrow the name or the badge
        $name = mb_substr(trim(Text::s($body['user'] ?? '')), 0, 60) ?: 'Guest User';
        if (preg_match('/admin|daivika/i', $name)) {
            $name = 'Guest User';
        }
        $isAdmin = false;
        $authUser = $this->user();
        if ($authUser && $authUser->role === 'admin') {
            $name = 'Admin';
            $isAdmin = true;
        }

        $review = Review::query()->find($reviewId);
        if (! $review) {
            return $this->error('Review not found', 404);
        }
        $replies = Json::list($review->replies);
        $replies[] = ['user' => $name, 'text' => $text, 'isAdmin' => $isAdmin, 'createdAt' => Text::nowIso()];
        $review->replies = $replies;
        $review->save();

        // Tell the review's author, when they have an account
        if ($review->email) {
            try {
                $author = User::query()->where('email', $review->email)->first();
                if ($author && $author->id !== $authUser?->id) {
                    $title = 'New Reply on your Review 💬';
                    $message = "$name replied to your review on {$review->productName}: \"".Text::truncate($text, 50).'"';
                    $link = "/product/{$review->productId}";
                    Notification::query()->create(['targetUserId' => $author->id, 'title' => $title, 'message' => $message, 'type' => 'review_reply', 'link' => $link]);
                    WebPushService::sendLater($author->id, $title, $message, $link);
                }
            } catch (\Throwable $e) {
                logger()->warning('Failed to save reply notification: '.$e->getMessage());
            }
        }
        return $this->ok($review->fresh()->toArray(), 200, ['message' => 'Reply added successfully!']);
    }

    private function like(): Response
    {
        $body = $this->body();
        $reviewId = Text::s($body['reviewId'] ?? '');
        if ($reviewId === '') {
            return $this->error('Missing reviewId.', 400);
        }
        $review = Review::query()->find($reviewId);
        if (! $review) {
            return $this->error('Review not found', 404);
        }
        $delta = ($body['action'] ?? null) === 'unlike' ? -1 : 1;
        $review->likes = max(0, (int) $review->likes + $delta);
        $review->save();
        return $this->ok($review->fresh()->toArray(), 200, ['message' => 'Likes updated successfully!']);
    }

    private function create(): Response
    {
        $body = $this->body();
        $user = mb_substr(trim(Text::s($body['user'] ?? '')), 0, 60);
        $productName = mb_substr(trim(Text::s($body['productName'] ?? '')), 0, 200);
        $comment = mb_substr(trim(Text::s($body['comment'] ?? '')), 0, 2000);
        $rating = $body['rating'] ?? null;
        $rating = is_numeric($rating) && floor((float) $rating) == $rating ? (int) $rating : null;
        if ($rating === null || $rating < 1 || $rating > 5) {
            return $this->error('Rating must be a whole number from 1 to 5.', 400);
        }

        $productId = Text::s($body['productId'] ?? '');
        if ($productId === '' && $productName !== '') {
            $productId = (string) Product::query()->whereRaw('LOWER("name") = ?', [mb_strtolower($productName)])->value('id');
        }
        if ($productId === '') {
            $productId = 'temp_prod_'.round(microtime(true) * 1000);
        }
        if ($user === '' || $productName === '') {
            return $this->error('Required review parameters (user, productName, rating) are missing.', 400);
        }

        $orderId = Text::s($body['orderId'] ?? '') ?: 'ORD_'.random_int(100000, 999999);
        $email = Text::s($body['email'] ?? '');

        $existing = Review::query()->where(['email' => $email, 'productId' => $productId, 'orderId' => $orderId])->first();
        if ($existing) {
            $existing->rating = $rating;
            $existing->comment = $comment;
            $existing->save();
            ProductCatalog::clearCache();
            AdminNotifier::notify('Review Updated ⭐', "$user updated their review for $productName to $rating stars: \"".($comment ?: 'No comment').'"', 'new_review', '/admin/dashboard?tab=product-reviews');
            return $this->ok($existing->fresh()->toArray(), 200, ['message' => 'Review updated successfully!']);
        }

        $review = Review::query()->create([
            'productId' => $productId,
            'user' => $user,
            'email' => $email,
            'productName' => $productName,
            'rating' => $rating,
            'comment' => $comment,
            'orderId' => $orderId,
            'likes' => 0,
            'replies' => [],
        ]);
        ProductCatalog::clearCache();
        AdminNotifier::notify('New Review Submitted ⭐', "$user gave $rating stars for $productName: \"".($comment ?: 'No comment').'"', 'new_review', '/admin/dashboard?tab=product-reviews');
        return $this->ok($review->fresh()->toArray(), 200, ['message' => 'Review submitted successfully!']);
    }

    private function destroy(): Response
    {
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        $id = $this->seg(0);
        if ($id === null) {
            return $this->error('Review ID is required', 400);
        }
        $deleted = Review::query()->whereKey($id)->delete();
        if (! $deleted) {
            return $this->error('Review not found', 404);
        }
        ProductCatalog::clearCache();
        return $this->ok(null, 200, ['message' => 'Review deleted successfully']);
    }
}
